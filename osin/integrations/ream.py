from __future__ import annotations
from typing import Dict, Generic, Optional, List
import time, os, re
from osin.types.pyobject_type import PyObjectType
from ream.actors.base import BaseActor, E, P
from osin.apis.remote_exp import RemoteExp
from contextlib import contextmanager
from dataclasses import make_dataclass
from osin.apis.osin import Osin
from ream.params_helper import DataClassInstance, NoParams


class OsinActor(Generic[E, P], BaseActor[E, P]):
    _osin: Optional[Osin] = None

    def __init__(self, params: P, dep_actors: Optional[List[BaseActor]] = None):
        super().__init__(params, dep_actors)
        self._exp: Optional[RemoteExp] = None

    @contextmanager
    def new_exp_run(self, **kwargs):
        """Start a new experiment run"""
        if self._osin is None:
            yield None
        else:
            exp_params = self.get_exp_run_params()
            if len(kwargs) > 0:
                C = make_dataclass(
                    "OsinParams", [(k, type(v)) for k, v in kwargs.items()]
                )
                ns = "osin"
                assert (
                    ns not in exp_params
                ), "OsinParams is a reserved classname for OsinActor generates dynamic parameters, please choose another name for your parameter classes"
                exp_params[ns] = C(**kwargs)
            if self._exp is None:
                self.logger.debug("Setup experiments...")
                cls = self.__class__
                assert cls.__doc__ is not None, "Please add docstring to the class"
                self._exp = self._osin.init_exp(
                    name=getattr(cls, "EXP_NAME", cls.__name__),  # type: ignore
                    version=getattr(cls, "EXP_VERSION", 1),
                    description=cls.__doc__,
                    params=exp_params,
                    update_param_schema=os.environ.get(
                        "OSIN_UPDATE_EXP_PARAM_SCHEMA", "false"
                    )
                    == "true",
                )

            exprun = self._exp.new_exp_run(exp_params)
            yield exprun
            if exprun is not None:
                self.logger.debug(
                    "Flushing run data of the experiment {} (run {})",
                    self._exp.name,
                    exprun.id,
                )
                start = time.time()
                exprun.finish()
                end = time.time()
                self.logger.debug(
                    "\tFlushing run data took {:.3f} seconds", end - start
                )

    def get_exp_run_params(
        self,
    ) -> dict[str, DataClassInstance]:
        """Get the parameters of the experiment run"""
        stack: List[BaseActor] = [self]
        params = {}

        # mapping from actor's class to its instance id
        # we want to ensure that we should only have one instance of each actor's class
        type2id = {}
        while len(stack) > 0:
            actor = stack.pop()
            if actor.__class__ in type2id:
                # only
                if id(actor) != type2id[actor.__class__]:
                    raise ValueError(
                        "Osin integration only support one instance of each actor class. We found more than one instance of {} in an actor graph".format(
                            actor.__class__
                        )
                    )
            else:
                # mark that we have visit this actor once
                type2id[actor.__class__] = id(actor)
                # handling a special case where the actor's has no parameters
                if isinstance(actor.params, NoParams):
                    continue

                # automatically generate a readable namespace for the parameter
                ns = self.gen_param_namespace(actor.params.__class__.__name__)
                if ns in params:
                    ns = self.gen_param_namespace(actor.__class__.__name__) + "_" + ns
                    if ns in params:
                        raise Exception(
                            "Unreachable code because this function assumes a class is unique in the actor graph and has a check for it."
                        )

                params[ns] = actor.params
            stack.extend(actor.dep_actors)

        return params

    def gen_param_namespace(self, classname: str) -> str:
        for k in ["Params", "Args", "Parameters", "Arguments", "Actor"]:
            if classname.endswith(k):
                classname = classname[: -len(k)]
                break

        # from inflection.underscore
        classname = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", classname)
        classname = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", classname)
        classname = classname.replace("-", "_")
        return classname.lower()
