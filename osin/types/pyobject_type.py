from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Union, get_args

Number = Union[int, float]
NoneType = type(None)
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
            elif hasattr(hint, "__origin__") and hasattr(hint.__origin__, "_name"):
                # found one case which is typing.Union
                path = hint.__module__ + "." + hint.__origin__._name
            else:
                raise NotImplementedError(hint)

        if path in TYPE_ALIASES:
            # do it here because in python 3.10 typing.Dict has __qualname__
            path = TYPE_ALIASES[path]

        if path != "typing.Literal":
            args = [PyObjectType.from_type_hint(arg) for arg in get_args(hint)]
        else:
            args = [
                PyObjectType(encode_literal_value(arg), []) for arg in get_args(hint)
            ]

        return PyObjectType(path, args=args)

    @staticmethod
    def get_classpath(hint) -> str:
        global TYPE_ALIASES

        if hasattr(hint, "__qualname__"):
            path = hint.__module__ + "." + hint.__qualname__
        elif hint.__module__ == "builtins":
            path = hint.__qualname__
        elif hasattr(hint, "_name") and hint._name is not None:
            # typically a class from the typing module
            path = hint.__module__ + "." + hint._name
        elif hasattr(hint, "__origin__") and hasattr(hint.__origin__, "_name"):
            # found one case which is typing.Union
            path = hint.__module__ + "." + hint.__origin__._name
        else:
            raise NotImplementedError(hint)
        if path in TYPE_ALIASES:
            path = TYPE_ALIASES[path]
        return path

    def is_instance(self, value: Any):
        global INSTANCE_OF
        return INSTANCE_OF[self.path](self, value)

    def make_optional(self):
        return PyObjectType(
            path="typing.Union", args=[self, PyObjectType.from_type_hint(NoneType)]
        )

    def is_optional(self):
        return (
            self.path == "typing.Union"
            and len(self.args) == 2
            and (self.args[0].path == "NoneType" or self.args[1].path == "NoneType")
        )

    def __repr__(self) -> str:
        if self.path.startswith("typing."):
            path = self.path[7:]
        else:
            path = self.path

        if len(self.args) > 0:
            return f"{path}[{', '.join(repr(arg) for arg in self.args)}]"
        else:
            return path


for type_ in [str, int, bool, float, Number]:
    PRIMITIVE_TYPES[type_] = PyObjectType.from_type_hint(type_)


def encode_literal_value(value):
    if isinstance(value, str):
        return f"osin.types.str[{value}]"
    elif isinstance(value, int):
        return f"osin.types.int[{value}]"
    elif isinstance(value, bool):
        return f"osin.types.bool[{value}]"
    raise ValueError(f"Invalid value {value} for typing.Literal")
