from __future__ import annotations

from dataclasses import dataclass
from typing import (
    Any,
    Dict,
    List,
    Union,
    get_args,
)
import typing

Number = Union[int, float]
TYPE_ALIASES = {"typing.List": "list", "typing.Dict": "dict", "typing.Set": "set"}
INSTANCE_OF = {
    "str": lambda ptype, x: isinstance(x, str),
    "int": lambda ptype, x: isinstance(x, int),
    "float": lambda ptype, x: isinstance(x, float),
    "typing.Union": lambda ptype, x: any(arg.is_instance(x) for arg in ptype.args),
}
PRIMITIVE_TYPES = {}


@dataclass
class PyObjectType:
    path: str
    args: List[PyObjectType]

    @staticmethod
    def from_tuple(t):
        return PyObjectType(path=t[0], args=[PyObjectType.from_tuple(x) for x in t[1]])

    @staticmethod
    def from_type_hint(hint) -> PyObjectType:
        global TYPE_ALIASES

        if hint.__module__ == "builtins":
            return PyObjectType(path=hint.__qualname__, args=[])

        if hasattr(hint, "__qualname__"):
            path = hint.__module__ + "." + hint.__qualname__
        else:
            # typically a class from the typing module
            if hasattr(hint, "_name") and hint._name is not None:
                path = hint.__module__ + "." + hint._name
                if path in TYPE_ALIASES:
                    path = TYPE_ALIASES[path]
            elif hasattr(typing, "_UnionGenericAlias") and isinstance(
                hint, getattr(typing, "_UnionGenericAlias")
            ):
                path = "typing.Union"
            else:
                raise NotImplementedError(hint)

        return PyObjectType(
            path, args=[PyObjectType.from_type_hint(arg) for arg in get_args(hint)]
        )

    def is_instance(self, value: Any):
        global INSTANCE_OF
        return INSTANCE_OF[self.path](self, value)

    def __repr__(self) -> str:
        if self.path.startswith("typing."):
            path = self.path[7:]
        else:
            path = self.path

        if len(self.args) > 0:
            return f"{path}[{', '.join(repr(arg) for arg in self.args)}]"
        else:
            return path


for type in [str, int, bool, float, Number]:
    PRIMITIVE_TYPES[type] = PyObjectType.from_type_hint(type)
