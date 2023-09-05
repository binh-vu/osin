from __future__ import annotations

import os
import re
import time
from contextlib import contextmanager
from dataclasses import make_dataclass
from typing import Generic, List, Optional, Protocol

from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExp
from ream.actors.base import BaseActorProtocol, P
from ream.cache_helper import Cache, MemBackend
from ream.params_helper import DataClassInstance, NoParams


class OsinActorProtocol(BaseActorProtocol[P], Protocol[P]):
    @property
    def _osin(self) -> Optional[Osin]:
        ...

    def get_exp_run_params(self) -> dict[str, DataClassInstance]:
        ...

    def gen_param_namespace(self, classname: str) -> str:
        ...

    def get_exp(self, exp_params: dict[str, DataClassInstance]) -> RemoteExp:
        ...


class OsinActorMixin(Generic[P]):
    _osin: Optional[Osin] = None

    @contextmanager
    def new_exp_run(self: OsinActorProtocol[P], **kwargs):
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

            exp = self.get_exp(exp_params)
            exprun = exp.new_exp_run(exp_params)
            yield exprun
            self.logger.debug(
                "Flushing run data of the experiment {} (run {})",
                exp.name,
                exprun.id,
            )
            start = time.time()
            exprun.finish()
            end = time.time()
            self.logger.debug("\tFlushing run data took {:.3f} seconds", end - start)

    def get_exp_run_params(
        self: OsinActorProtocol[P],
    ) -> dict[str, DataClassInstance]:
        """Get the parameters of the experiment run"""
        stack: List[BaseActorProtocol] = [self]
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

    # cache_args so this function only runs once.
    @Cache.cache(backend=MemBackend(), cache_args=[])
    def get_exp(
        self: OsinActorProtocol[P], exp_params: dict[str, DataClassInstance]
    ) -> RemoteExp:
        assert self._osin is not None
        self.logger.debug("Setup experiments...")
        cls = self.__class__
        assert cls.__doc__ is not None, "Please add docstring to the class"
        return self._osin.init_exp(
            name=getattr(cls, "EXP_NAME", cls.__name__),  # type: ignore
            version=getattr(cls, "EXP_VERSION", 1),
            description=cls.__doc__,
            params=exp_params,
            update_param_schema=os.environ.get("OSIN_UPDATE_EXP_PARAM_SCHEMA", "false")
            == "true",
        )
