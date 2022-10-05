from __future__ import annotations
from abc import abstractmethod, ABC
import os
from pathlib import Path
from typing import (
    Callable,
    List,
    Optional,
    Type,
    TypeVar,
    Union,
    Generic,
)
from osin.actor_model.actor_state import ActorState
from osin.actor_model.params_helper import EnumParams

from osin.apis.remote_exp import RemoteExpRun
from osin.actor_model.cache_helper import CacheRepository
from loguru import logger

E = TypeVar("E")
P = TypeVar("P")
CK = TypeVar("CK", bound=Union[str, int])
CV = TypeVar("CV")
C = TypeVar("C")


class Actor(ABC, Generic[E]):
    """A foundation unit to define a computational graph, which is your program.

    It can be:
        * your entire method
        * a component in your pipeline such as preprocessing
        * a wrapper, wrapping a library, or a step in your algorithm
            that you want to try different method, and see their performance

    Therefore, it should have two basic methods:
        * run: to run the actor with a given input
        * evaluate: to evaluate the current code with a list of given inputs, and
            optionally store some debug information.

    ## How to configure this actor?

    It can be configured via dataclasses containing parameters.
    However, this comes with a limitation that the parameters should
    be immutable and any changes to the parameters must be done in a new actor.
    This is undesirable, but necessary to make this actor cache friendly.

    Commonly, we want to evaluate the actor on different datasets. However, our
    interface is desired to run for each example, which makes it easy to convert
    research code to the production code without much changes. Because of this,
    we cannot pass the dataset as an argument of the method, but has to set the dataset
    as the actor's parameters.
    """

    @abstractmethod
    def batch_run(self, examples: List[E]):
        """Run the actor with a list of examples"""
        pass

    @abstractmethod
    def run(self, example: E):
        """Run the actor with a single example"""
        pass

    @abstractmethod
    def evaluate(self, examples: List[E]):
        """Evaluate the actor on a list of examples, and return the results as
        if the function `batch_run` is called.

        The evaluation metrics can be printed to the console, or stored in a temporary variable of this class to access it later.
        """
        pass


class BaseActor(Generic[E, P, C], Actor[E]):
    def __init__(
        self,
        params: P,
        dep_actors: Optional[List[BaseActor]] = None,
        cache_factory: Optional[Callable[[Path], C]] = None,
    ):
        self._cache_factory = cache_factory
        self._cache: Optional[C] = None
        self._exprun: Optional[RemoteExpRun] = None
        self.dep_actors = dep_actors or []
        self.params = params

    def get_actor_state(self) -> ActorState:
        """Get the state of this actor"""
        deps = [actor.get_actor_state() for actor in self.dep_actors]

        if isinstance(self.params, EnumParams):
            deps.append(
                ActorState.create(
                    self.params.get_method_class(), self.params.get_method_params()
                )
            )
            params = self.params.without_method_args()
        else:
            params = self.params

        return ActorState.create(
            self.__class__,
            params,
            dependencies=deps,
        )

    def _get_cache(self) -> C:
        """Get a cache for this actor that can be used to store the results of each example."""
        if self._cache_factory is None:
            raise ValueError("Trying to get cache, but cache factory is not provided")

        if self._cache is None:
            state = self.get_actor_state()
            cache_dir = CacheRepository.get_instance().reserve_cache_dir(state)
            logger.debug(
                "[{}] Using cache directory: {}", self.__class__.__qualname__, cache_dir
            )
            self._cache = self._cache_factory(cache_dir)
        return self._cache

    @classmethod
    @abstractmethod
    def get_param_cls(cls) -> Type[P]:
        """Get the parameter class of this actor"""
        raise NotImplementedError()

    def get_verbose_level(self) -> int:
        """Get the verbose level of this actor from the environment variable"""
        return int(os.environ.get(self.__class__.__name__.upper() + "_VERBOSE", "0"))


class NoInputActor(Generic[P, C], BaseActor[None, P, C]):
    def batch_run(self):
        """Run the actor with a list of examples"""
        raise ValueError(
            "This actor does not accept any input. Use `run` method instead"
        )

    @abstractmethod
    def run(self):
        """Run the actor with a single example"""
        pass

    def evaluate(self):
        raise ValueError(
            "This actor does not accept any input, so it's likely that there is no evaluation. Override this method if you need to"
        )
