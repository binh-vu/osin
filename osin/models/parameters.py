from __future__ import annotations
from functools import partial
import typing
from typing import Any, Dict, List, Optional, Sequence, Union, get_args
from tap import Tap
from dataclasses import dataclass


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


@dataclass
class NestedPrimitiveOutputSchema:
    schema: Dict[str, Union[PyObjectType, "NestedPrimitiveOutputSchema"]]

    @staticmethod
    def from_tuple(object):
        schema = {}
        for prop, prop_type in object[0].items():
            if isinstance(prop_type[0], dict):
                schema[prop] = NestedPrimitiveOutputSchema.from_tuple(prop_type)
            else:
                schema[prop] = PyObjectType.from_tuple(prop_type)
        return NestedPrimitiveOutputSchema(schema)

    @staticmethod
    def infer_from_data(
        data: Dict[str, Any], use_number_type: bool = True
    ) -> NestedPrimitiveOutputSchema:
        schema = {}
        for key, value in data.items():
            if isinstance(value, dict):
                schema[key] = NestedPrimitiveOutputSchema.infer_from_data(
                    value, use_number_type
                )
            elif isinstance(value, str):
                schema[key] = PRIMITIVE_TYPES[str]
            elif isinstance(value, int):
                if use_number_type:
                    schema[key] = PRIMITIVE_TYPES[Number]
                else:
                    schema[key] = PRIMITIVE_TYPES[int]
            elif isinstance(value, float):
                if use_number_type:
                    schema[key] = PRIMITIVE_TYPES[Number]
                else:
                    schema[key] = PRIMITIVE_TYPES[float]
            elif isinstance(value, bool):
                schema[key] = PRIMITIVE_TYPES[bool]
            else:
                raise ValueError("{} is not a primitive type".format(value))

        return NestedPrimitiveOutputSchema(schema=schema)

    def does_data_match(self, data: Dict[str, Any]) -> bool:
        if set(self.schema.keys()) != set(data.keys()):
            return False

        for prop, prop_schema in self.schema.items():
            value = data[prop]
            if isinstance(prop_schema, NestedPrimitiveOutputSchema):
                if not prop_schema.does_data_match(value):
                    return False
            else:
                if not prop_schema.is_instance(value):
                    return False

        return True

    def __repr__(self) -> str:
        output = []
        for prop, prop_schema in self.schema.items():
            if isinstance(prop_schema, NestedPrimitiveOutputSchema):
                output.append(f"{prop}:")
                for line in str(prop_schema).split("\n"):
                    output.append("    " + line)
            else:
                output.append(f"{prop}: {prop_schema}")

        return "\n".join(output)
