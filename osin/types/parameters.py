from __future__ import annotations
from abc import abstractmethod, ABC
from functools import partial
from pathlib import Path
from typing import (
    Dict,
    List,
    Union,
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
            for name, hint in params._get_annotations().items():
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
