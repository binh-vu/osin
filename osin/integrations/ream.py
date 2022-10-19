from __future__ import annotations
from typing import Dict, Generic, Optional, List
import time
from ream.actors.base import BaseActor, E, P
from osin.apis.remote_exp import RemoteExp
from contextlib import contextmanager
from dataclasses import make_dataclass
from osin.apis.osin import Osin
from ream.params_helper import DataClassInstance


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
                    "DynamicParams", [(k, type(v)) for k, v in kwargs.items()]
                )
                exp_params.append(C(**kwargs))

            if self._exp is None:
                self.logger.debug("Setup experiments...")
                cls = self.__class__
                assert cls.__doc__ is not None, "Please add docstring to the class"
                self._exp = self._osin.init_exp(
                    name=getattr(cls, "NAME", cls.__name__),  # type: ignore
                    version=getattr(cls, "EXP_VERSION", 1),
                    description=cls.__doc__,
                    params=exp_params,
                )

            exprun = self._exp.new_exp_run(exp_params)
            yield exprun
            if exprun is not None:
                self.logger.debug(
                    "Flushing run data of the experiment {}", self._exp.name
                )
                start = time.time()
                exprun.finish()
                end = time.time()
                self.logger.debug(
                    "\tFlushing run data took {:.3f} seconds", end - start
                )

    def get_exp_run_params(self) -> List[DataClassInstance]:
        """Get the parameters of the experiment run"""
        # we can use id() to guarantee the uniqueness of the actor
        # but instead we use the class
        stack: List[BaseActor] = [self]
        params = []
        type2id = {}
        while len(stack) > 0:
            actor = stack.pop()
            if actor.__class__ in type2id:
                assert id(actor) == type2id[actor.__class__]
            else:
                type2id[actor.__class__] = id(actor)
                params.append(actor.params)
            stack.extend(actor.dep_actors)

        return params
