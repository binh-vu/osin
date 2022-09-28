from abc import abstractmethod, ABC
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

from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExpRun
from osin.graph.cache_helper import CacheId
from osin.graph.params_parser import ParamsParser
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
    This is undesirable, but necessary to allow this actor thread-safe.

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
    def __init__(self, params: P, cache_factory: Optional[Callable[[Path], C]] = None):
        self._cache_factory = cache_factory
        self._cache: Optional[C] = None
        self._exprun: Optional[RemoteExpRun] = None
        self.params = params

    def _get_cache(self) -> C:
        """Get a cache for this actor that can be used to store the results of each example."""
        if self._cache_factory is None:
            raise ValueError("Trying to get cache, but cache factory is provided")

        if self._cache is None:
            cache_id = self._get_cache_id()
            cache_dir = cache_id.reserve_cache_dir()
            logger.debug("Using cache directory: {}", cache_dir)
            self._cache = self._cache_factory(cache_dir)
        return self._cache

    @classmethod
    def main(cls, osin_dir: Optional[Union[str, Path]] = None, exp_version: int = 1):
        """Run the actor independently."""
        logger.debug("Parsing parameters...")
        parser = ParamsParser(cls._get_param_cls())
        params = parser.parse_args()

        instance = cls(params)

        if osin_dir is not None:
            logger.debug("Setup experiments...")
            assert cls.__doc__ is not None, "Please add docstring to the class"
            osin = Osin.local(osin_dir)
            instance._exprun = osin.init_exp(
                name=getattr(cls, "NAME", cls.__name__),
                version=exp_version,
                description=cls.__doc__,
                params=params,
            ).new_exp_run(instance.params)

        logger.debug("Run evaluation...")
        instance.evaluate(instance._load_examples())

        if osin_dir is not None:
            logger.debug("Cleaning up the experiments...")
            assert instance._exprun is not None
            instance._exprun.finish()

    def _load_examples(self) -> List[E]:
        """Optional method to load the examples from the dataset. Needed to use `main` method."""
        raise NotImplementedError()

    @classmethod
    def _get_param_cls(cls) -> Type[P]:
        """Optional method to get the parameter class. Needed to use `main` method."""
        raise NotImplementedError()

    def _get_cache_id(self) -> CacheId:
        """Optional method to get the cache id. Needed to use `_get_cache` method."""
        raise NotImplementedError()
