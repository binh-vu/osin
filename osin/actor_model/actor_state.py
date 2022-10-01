from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from dataclasses import dataclass
import os
from pathlib import Path
import pickle
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Type,
    Union,
)
from hugedict.prelude import RocksDBDict, RocksDBOptions
from loguru import logger
import orjson
from osin.misc import Directory, orjson_dumps
from slugify import slugify
from osin.actor_model.params_helper import param_as_dict
from osin.types.pyobject_type import PyObjectType


@dataclass
class ActorState:
    """Represent a state of an actor, including its class, versions, and parameters"""

    classpath: str
    classversion: str
    params: Union[Any, List[Any], Dict[str, Any]]
    dependencies: List[ActorState]

    @staticmethod
    def create(
        CLS: Type,
        args: Union[Any, List[Any], Dict[str, Any]],
        version: Optional[str] = None,
        dependencies: Optional[List[ActorState]] = None,
    ) -> ActorState:
        """Compute a unique cache id"""
        if version is None:
            assert hasattr(CLS, "VERSION"), "Class must have a VERSION attribute"
            version = getattr(CLS, "VERSION")

        assert isinstance(version, str), "Version must be a string"

        classpath = PyObjectType.from_type_hint(CLS).path

        return ActorState(
            classpath=classpath,
            classversion=version,
            params=args,
            dependencies=dependencies or [],
        )

    def to_dict(self) -> dict:
        """Return the state in dictionary form, mainly used for comparing the state"""
        if isinstance(self.params, list):
            params = [param_as_dict(p) for p in self.params]
        elif isinstance(self.params, dict):
            params = {k: param_as_dict(v) for k, v in self.params.items()}
        else:
            params = param_as_dict(self.params)

        return {
            "classpath": self.classpath,
            "classversion": self.classversion,
            "params": params,
            "dependencies": [d.to_dict() for d in self.dependencies],
        }
