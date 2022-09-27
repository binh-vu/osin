from __future__ import annotations
from abc import abstractmethod, ABC
from dataclasses import is_dataclass
from functools import partial
from pathlib import Path
from typing import (
    Dict,
    List,
    Union,
    get_type_hints,
)
from tap import Tap
from osin.types.pyobject_type import PyObjectType


class Parameters(Tap):
    @staticmethod
    def get_param_types(
        paramss: Union[Parameters, List[Parameters]]
    ) -> Dict[str, PyObjectType]:
        if not isinstance(paramss, list):
            paramss = [paramss]

        output = {}
        for params in paramss:
            if is_dataclass(params):
                # temporary hack before moving away from tap and transition to dataclass
                type_hints = get_type_hints(params)
            else:
                type_hints = params._get_annotations()
            for name, hint in type_hints.items():
                if name in output:
                    raise KeyError("Duplicate parameter name: {}".format(name))

                output[name] = PyObjectType.from_type_hint(hint)
        return output

    def as_dict(self) -> dict:
        o = {}
        for k, v in super().as_dict().items():
            if isinstance(v, Path):
                o[k] = str(v)
            elif callable(v):
                # these are user-defined methods
                continue
            else:
                o[k] = v
        return o
