from __future__ import annotations
from dataclasses import dataclass, is_dataclass
from typing import Any, Union, get_type_hints

from osin.types.pyobject_type import PyObjectType


DataClassInstance = Any


@dataclass
class ParamSchema:
    type: PyObjectType
    schema: dict[str, Union[PyObjectType, ParamSchema]]

    @staticmethod
    def from_tuple(object):
        type = PyObjectType.from_tuple(object[0])
        schema = {}
        for prop, prop_type in object[1].items():
            if isinstance(prop_type[0], dict):
                schema[prop] = ParamSchema.from_tuple(prop_type)
            else:
                schema[prop] = PyObjectType.from_tuple(prop_type)
        return ParamSchema(type, schema)

    @staticmethod
    def get_schema(param: DataClassInstance) -> ParamSchema:
        """Derive parameter types from a dataclass"""
        assert is_dataclass(param), "Parameters must be an instance of a dataclass"
        type_hints = get_type_hints(param.__class__)
        output = {}
        for name, hint in type_hints.items():
            if name in output:
                raise KeyError("Duplicate parameter name: {}".format(name))

            output[name] = PyObjectType.from_type_hint(hint)
        return ParamSchema(PyObjectType.from_type_hint(param.__class__), output)
