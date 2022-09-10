from __future__ import annotations
from typing import Any, Dict, List, Optional, Sequence, Union, get_args
from tap import Tap
from dataclasses import dataclass


@dataclass
class PyObjectType:
    path: str
    args: List[PyObjectType]

    @staticmethod
    def from_type_hint(hint) -> PyObjectType:
        if hint.__class__.__module__ == "builtins":
            return PyObjectType(path=hint.__qualname__, args=[])

        path = hint.__class__.__module__ + "." + hint.__qualname__
        return PyObjectType(
            path, args=[PyObjectType.from_type_hint(arg) for arg in get_args(hint)]
        )


@dataclass
class PyObject:
    object: Any
    type: PyObjectType


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
