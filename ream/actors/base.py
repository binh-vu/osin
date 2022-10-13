from __future__ import annotations
from abc import abstractmethod
from contextlib import contextmanager
from dataclasses import make_dataclass
import functools
import os
import time
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Type,
    TypeVar,
    Union,
    Generic,
)
from osin.apis.osin import Osin
from ream.actor_state import ActorState
from ream.params_helper import DataClassInstance, EnumParams
from ream.fs import FS
from ream.workspace import ReamWorkspace
from osin.apis.remote_exp import RemoteExpRun, RemoteExp
from loguru import logger
from ream.actors.interface import Actor, E

P = TypeVar("P")


class BaseActor(Generic[E, P], Actor[E]):
    def __init__(
        self,
        params: P,
        dep_actors: Optional[List[BaseActor]] = None,
    ):
        self._working_fs: Optional[FS] = None
        self._osin: Optional[Osin] = None
        self._exp: Optional[RemoteExp] = None
        self.dep_actors = dep_actors or []
        self.params = params
        self.logger = logger.bind(cls=self.__class__.__name__)

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

    def _get_working_fs(self) -> FS:
        """Get a working directory for this actor that can be used to store the results of each example."""
        if self._working_fs is None:
            state = self.get_actor_state()
            cache_dir = ReamWorkspace.get_instance().reserve_working_dir(state)
            self.logger.debug(
                "Using working directory: {}",
                cache_dir,
            )
            self._working_fs = FS(cache_dir)
        return self._working_fs

    @contextmanager
    def _new_exp_run(self, **kwargs):
        if self._osin is None:
            yield None
        else:
            exp_params = self._get_exp_run_params()
            if len(kwargs) > 0:
                C = make_dataclass(
                    "DynamicParams", [(k, type(v)) for k, v in kwargs.items()]
                )
                exp_params.append(C(**kwargs))

            if self._exp is None:
                self._exp = self._osin.init_exp(
                    name=getattr(self.__class__, "NAME", self.__class__.__name__),  # type: ignore
                    version=getattr(self.__class__, "EXP_VERSION", 1),
                    description=self.__class__.__doc__,
                    params=exp_params,
                )

            exprun = self._exp.new_exp_run(exp_params)
            yield exprun
            if exprun is not None:
                logger.debug("Flushing run data of the experiment {}", self._exp.name)
                start = time.time()
                exprun.finish()
                end = time.time()
                logger.debug("\tFlushing run data took {:.3f} seconds", end - start)

    def _get_exp_run_params(self) -> DataClassInstance | List[DataClassInstance]:
        params = []
        for dep_actor in self.dep_actors:
            params.extend(dep_actor._get_exp_run_params())
        params.append(self.params)
        return params

    @staticmethod
    def filecache(
        filename: Union[str, Callable[..., str]],
        serialize: Callable[[Any, Path], None],
        deserialize: Callable[[Path], Any],
    ) -> Callable:
        def wrapper_fn(func):
            @functools.wraps(func)
            def fn(self: BaseActor, *args, **kwargs):
                fs = self._get_working_fs()
                if isinstance(filename, str):
                    cache_filename = filename
                else:
                    cache_filename = filename(*args, **kwargs)

                cache_file = fs.get(cache_filename)
                if not cache_file.exists():
                    with fs.acquire_write_lock():
                        output = func(self, *args, **kwargs)
                        with cache_file.reserve_and_track() as fpath:
                            serialize(output, fpath)
                else:
                    output = deserialize(cache_file.get())
                return output

            return fn

        return wrapper_fn

    @classmethod
    @abstractmethod
    def get_param_cls(cls) -> Type[P]:
        """Get the parameter class of this actor"""
        raise NotImplementedError()

    def get_verbose_level(self) -> int:
        """Get the verbose level of this actor from the environment variable"""
        return int(os.environ.get(self.__class__.__name__.upper() + "_VERBOSE", "0"))
