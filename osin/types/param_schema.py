from __future__ import annotations
from dataclasses import dataclass, is_dataclass
from typing import Any, Optional, Union, get_args, get_origin, get_type_hints

from osin.types.pyobject_type import PyObjectType, NoneType


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
            if isinstance(prop_type[1], dict):
                schema[prop] = ParamSchema.from_tuple(prop_type)
            else:
                schema[prop] = PyObjectType.from_tuple(prop_type)
        return ParamSchema(type, schema)

    @staticmethod
    def get_schema(param: DataClassInstance) -> ParamSchema:
        """Derive parameter types from a dataclass"""
        assert is_dataclass(
            param
        ), "Parameters must be an instance of a dataclass or a dataclass"
        param_cls = param if isinstance(param, type) else param.__class__
        type_hints = get_type_hints(param_cls)
        output = {}
        for name, hint in type_hints.items():
            if name in output:
                raise KeyError("Duplicate parameter name: {}".format(name))

            if is_dataclass(hint):
                output[name] = ParamSchema.get_schema(hint)
            else:
                origin = get_origin(hint)
                args = get_args(hint)

                if ParamSchema.is_optional_type(origin, args):
                    subtype = args[0] if args[0] != NoneType else args[1]
                    if is_dataclass(subtype):
                        schema = ParamSchema.get_schema(subtype)
                        schema.type = schema.type.make_optional()
                        output[name] = schema
                        continue
                output[name] = PyObjectType.from_type_hint(hint)
        return ParamSchema(PyObjectType.from_type_hint(param_cls), output)

    @staticmethod
    def is_optional_type(origin: Optional[type], args: tuple[type, ...]):
        return origin is Union and len(args) == 2 and NoneType in args
