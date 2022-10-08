from __future__ import annotations

from dataclasses import dataclass, is_dataclass
from operator import attrgetter
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Sequence,
    Tuple,
    Type,
    Union,
)

import yada
from graph.interface import BaseEdge, BaseNode
from graph.retworkx.digraph import RetworkXDiGraph
from loguru import logger
from osin.actor_model.base_actor import BaseActor
from osin.actor_model.params_helper import DataClassInstance
from osin.apis.osin import Osin
from osin.types.pyobject_type import PyObjectType


class ActorNode(BaseNode):
    def __init__(
        self, id: int, cls: Type[BaseActor], cls_constructor: Optional[Callable] = None
    ):
        self.id = id
        self.cls = cls
        if cls_constructor is not None:
            self.cls_constructor = cls_constructor
        else:
            self.cls_constructor = lambda params, dep_actors: cls(params, *dep_actors)

        self.clspath = PyObjectType.from_type_hint(cls).path

    @staticmethod
    def new(
        type: Type[BaseActor], cls_constructor: Optional[Callable] = None
    ) -> "ActorNode":
        return ActorNode(id=-1, cls=type, cls_constructor=cls_constructor)

    def has_short_name(self, name: str) -> bool:
        return self.clspath.endswith(name)


class ActorGraph(RetworkXDiGraph[int, ActorNode, BaseEdge]):
    @dataclass
    class ActorConstructor:
        graph: ActorGraph
        main: ActorNode
        params_cls: Any
        node2param: Dict[Type, Tuple[int, int]]
        node2cls: Dict[Type, ActorNode]

        def get_params_parser(self) -> yada.YadaParser:
            return yada.YadaParser(self.params_cls)

        def create_actor(self, params: List[DataClassInstance]):
            output = {}
            self._create_actors(self.main, params, output)
            return output[self.main.cls]

        def create_actors(
            self, nodes: List[ActorNode], params: List[DataClassInstance]
        ) -> List[BaseActor]:
            output = {}
            self._create_actors(self.main, params, output)
            return [output[node.cls] for node in nodes]

        def _create_actors(
            self,
            node: ActorNode,
            params: List[DataClassInstance],
            output: Dict[Type, BaseActor],
        ):
            start, end = self.node2param[node.cls]
            if end == start + 1:
                node_params = params[start]
            else:
                node_params = params[start:end]

            inedges = self.graph.in_edges(node.id)
            if len(inedges) == 0:
                try:
                    output[node.cls] = node.cls_constructor(node_params, dep_actors=[])
                except:
                    logger.error("Error when creating actor {}", node.cls)
                    raise
                return

            dep_actors = []
            for inedge in sorted(inedges, key=attrgetter("key")):
                source = self.graph.get_node(inedge.source)
                if source.cls not in output:
                    self._create_actors(source, params, output)
                dep_actors.append(output[source.cls])

            try:
                output[node.cls] = node.cls_constructor(node_params, dep_actors)
            except:
                logger.error("Error when creating actor {}", node.cls)
                raise

    @staticmethod
    def new():
        return ActorGraph(check_cycle=True, multigraph=False)

    def create_actor(
        self, actor_class: Union[str, Type], args: Optional[Sequence[str]] = None
    ):
        """Create an actor from arguments passed through the command lines

        Args:
            actor_class: The class of the actor to run. If there are multiple actors
                in the graph having the same name, it will throw an error.
            args: The arguments to the . If not provided, it will use the arguments from sys.argv
        """
        logger.debug("Determine the actor to run...")
        actor_node = self.get_actor_by_classname(actor_class)
        logger.debug("Initializing argument parser...")
        constructor = self.get_actor_constructor(actor_node)
        parser = constructor.get_params_parser()
        params = parser.parse_args(args)

        logger.debug("Constructing the actor...")
        actor = constructor.create_actor(params)
        return actor

    def evaluate(
        self,
        actor_class: Union[str, Type],
        osin_dir: Optional[Union[str, Path]] = None,
        exp_version: Optional[int] = None,
        args: Optional[Sequence[str]] = None,
        eval_args: Optional[Sequence[str]] = None,
    ):
        """Run an actor in evaluation mode.

        Args:
            actor_class: The class of the actor to run. If there are multiple actors
                in the graph having the same name, it will throw an error.
            osin_dir: The directory of the osin database. If not provided, it will not
                save the results to the database.
            exp_version: The version of the experiment, default is to obtain it from the actor class.
            args: The arguments to the params parser. If not provided, it will use the arguments from sys.argv
            eval_args: The arguments to the evaluate method.
        """
        logger.debug("Determine the actor to run...")
        actor_node = self.get_actor_by_classname(actor_class)
        logger.debug("Initializing argument parser...")
        constructor = self.get_actor_constructor(actor_node)
        parser = constructor.get_params_parser()
        params = parser.parse_args(args)

        logger.debug("Constructing the actor...")
        actor = constructor.create_actor(params)

        CLS = actor.__class__
        if osin_dir is not None:
            logger.debug("Setup experiments...")
            assert CLS.__doc__ is not None, "Please add docstring to the class"
            osin = Osin.local(osin_dir)
            actor._exprun = osin.init_exp(
                name=getattr(CLS, "NAME", CLS.__name__),  # type: ignore
                version=getattr(CLS, "EXP_VERSION", 1)
                if exp_version is None
                else exp_version,
                description=CLS.__doc__,
                params=params,
            ).new_exp_run(params)

        logger.debug("Run evaluation...")
        actor.evaluate(*(eval_args or ()))

        if osin_dir is not None:
            logger.debug("Cleaning up the experiments...")
            assert actor._exprun is not None
            actor._exprun.finish()

    def get_actor_constructor(self, actor_node: ActorNode) -> ActorConstructor:
        nodes = {}
        params_cls: List[Any] = []
        node2param: Dict[Type, Tuple[int, int]] = {}
        for node in self.ancestors(actor_node.id) + [actor_node]:
            if node.cls in nodes:
                raise ValueError(
                    f"Cannot generate argument parser because we have more than one instance of {node.cls} in the actor graph."
                )
            nodes[node.cls] = node
            node_param_cls = node.cls.get_param_cls()
            if isinstance(node_param_cls, list):
                node2param[node.cls] = (
                    len(params_cls),
                    len(params_cls) + len(node_param_cls),
                )
                params_cls.extend(node_param_cls)
            else:
                if not is_dataclass(node_param_cls):
                    raise TypeError(
                        f"We cannot generate argument parser automatically because parameter class of {node.cls} is not a dataclass or a list of dataclasses. It is {node_param_cls}"
                    )
                node2param[node.cls] = (len(params_cls), len(params_cls) + 1)
                params_cls.append(node_param_cls)

        return ActorGraph.ActorConstructor(
            graph=self,
            main=actor_node,
            params_cls=params_cls,
            node2param=node2param,
            node2cls=nodes,
        )

    def get_actor_by_classname(self, actor_class: Union[str, Type]) -> ActorNode:
        if isinstance(actor_class, str):
            matched_nodes = [
                node for node in self.iter_nodes() if node.has_short_name(actor_class)
            ]
        else:
            matched_nodes = [
                node for node in self.iter_nodes() if node.cls == actor_class
            ]
        if len(matched_nodes) == 0:
            raise ValueError(f"Cannot find actor with name {actor_class}")
        elif len(matched_nodes) > 1:
            raise ValueError(
                f"Multiple actors with name {actor_class} found: {[x.cls for x in matched_nodes]}"
                "Try to specify a longer name if you are using a short name."
            )
        return matched_nodes[0]


# def evaluate(
#     actor_graph: ActorGraph,
#     actor_class: str,
#     example_class: Optional[str] = None,
#     osin_dir: Optional[Union[str, Path]] = None,
#     exp_version: int = 1,
#     args: Optional[Sequence[str]] = None,
# ):
#     """Run an actor in evaluation mode.

#     Args:
#         actor_graph: The actor graph
#         actor_class: The class of the actor to run. If there are multiple actors
#             in the graph having the same name, it will throw an error.
#         example_class: The class of a NoInputActor that will produce the examples
#             to evaluate. If missing, it means the actor_class do not require
#             any examples to run.
#         osin_dir: The directory of the osin database. If not provided, it will not
#             save the results to the database.
#         exp_version: The version of the experiment.
#         args: The arguments to the . If not provided, it will use the arguments from sys.argv
#     """
#     logger.debug("Determine the actor to run...")
#     actor_node = find_actor_by_cls(actor_graph, actor_class)
#     if example_class is not None:
#         example_node = find_actor_by_cls(actor_graph, example_class)
#     else:
#         example_node = None

#     logger.debug("Initializing argument parser...")
#     nodes = {}
#     params_cls: List[Any] = []
#     node2param: Dict[Type, Tuple[int, int]] = {}
#     for node in actor_graph.predecessors(actor_node.id) + [actor_node]:
#         if node.cls in nodes:
#             raise ValueError(
#                 f"Cannot generate argument parser because we have more than one instance of {node.cls} in the actor graph."
#             )
#         nodes[node.cls] = node
#         node_param_cls = node.cls.get_param_cls()
#         if isinstance(node_param_cls, list):
#             node2param[node.cls] = (
#                 len(params_cls),
#                 len(params_cls) + len(node_param_cls),
#             )
#             params_cls.extend(node_param_cls)
#         else:
#             if not is_dataclass(node_param_cls):
#                 raise TypeError(
#                     f"We cannot generate argument parser automatically because parameter class of {node.cls} is not a dataclass or a list of dataclasses. It is {node_param_cls}"
#                 )
#             node2param[node.cls] = (len(params_cls), len(params_cls) + 1)
#             params_cls.append(node_param_cls)

#     if example_node is not None and example_node.cls not in nodes:
#         raise ValueError(
#             f"The actor node {actor_node.cls} does not depend on the example node {example_node.cls} in the actor graph."
#         )

#     params = (params_cls).parse_args(args)  # type: ignore

#     logger.debug("Constructing the actors...")
#     node2actor = {}
#     create_actors(actor_graph, actor_node, node2param, params, node2actor)

#     actor = node2actor[actor_node.cls]
#     if example_node is not None:
#         example_actor = node2actor[example_node.cls]
#         assert isinstance(example_actor, NoInputActor)
#     else:
#         example_actor = None
#         assert isinstance(actor, NoInputActor)

#     CLS = actor.__class__
#     if osin_dir is not None:
#         logger.debug("Setup experiments...")
#         assert CLS.__doc__ is not None, "Please add docstring to the class"
#         osin = Osin.local(osin_dir)
#         actor._exprun = osin.init_exp(
#             name=getattr(CLS, "NAME", CLS.__name__),  # type: ignore
#             version=exp_version,
#             description=CLS.__doc__,
#             params=params,
#         ).new_exp_run(params)

#     logger.debug("Run evaluation...")
#     if example_actor is not None:
#         examples = cast(list, example_actor.run())
#         actor.evaluate(examples)
#     else:
#         actor.evaluate()

#     if osin_dir is not None:
#         logger.debug("Cleaning up the experiments...")
#         assert actor._exprun is not None
#         actor._exprun.finish()


# def create_actors(
#     graph: ActorGraph,
#     node: ActorNode,
#     node2param: Dict[Type, Tuple[int, int]],
#     params: List[DataClassInstance],
#     output: Dict[Type, BaseActor],
# ):
#     start, end = node2param[node.cls]
#     if end == start + 1:
#         node_params = params[start]
#     else:
#         node_params = params[start:end]

#     inedges = graph.in_edges(node.id)
#     if len(inedges) == 0:
#         try:
#             output[node.cls] = node.cls_constructor(node_params, dep_actors=[])
#         except:
#             logger.error("Error when creating actor {}", node.cls)
#             raise
#         return

#     dep_actors = []
#     for inedge in sorted(inedges, key=attrgetter("key")):
#         source = graph.get_node(inedge.source)
#         if source.cls not in output:
#             create_actors(graph, source, node2param, params, output)
#         dep_actors.append(output[source.cls])

#     try:
#         output[node.cls] = node.cls_constructor(node_params, dep_actors)
#     except:
#         logger.error("Error when creating actor {}", node.cls)
#         raise


# def find_actor_by_cls(actor_graph: ActorGraph, actor_class: str) -> ActorNode:
#     matched_nodes = [
#         node for node in actor_graph.iter_nodes() if node.has_short_name(actor_class)
#     ]
#     if len(matched_nodes) == 0:
#         raise ValueError(f"Cannot find actor with name {actor_class}")
#     elif len(matched_nodes) > 1:
#         raise ValueError(
#             f"Multiple actors with name {actor_class} found: {[x.cls for x in matched_nodes]}"
#             "Try to specify a longer name if you are using a short name."
#         )
#     return matched_nodes[0]
