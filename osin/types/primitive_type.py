from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Union, Mapping
from osin.types.pyobject_type import PRIMITIVE_TYPES, Number, PyObjectType


PrimitiveValue = Union[str, int, float, bool, None]
NestedPrimitiveOutput = dict[str, Union[PrimitiveValue, "NestedPrimitiveOutput"]]


class InvalidValueType(Exception):
    def __init__(self, valid_type: str):
        super().__init__(self)
        self.valid_type = valid_type
        self.trace = []

    def add_trace(self, *parents: str):
        self.trace.extend(reversed(parents))
        return self

    def __str__(self):
        return f"Expect {self.valid_type} but receive value type: {'·'.join(reversed(self.trace))}"


@dataclass
class NestedPrimitiveOutputSchema:
    schema: Dict[str, Union[PyObjectType, NestedPrimitiveOutputSchema]]

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
        data: Mapping[str, Any], use_number_type: bool = True
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

    def does_data_match(self, data: Mapping[str, Any]) -> bool:
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


def validate_primitive_data(data: NestedPrimitiveOutput):
    for key, value in data.items():
        if value is not None and not isinstance(value, (str, bool, int, float, dict)):
            raise InvalidValueType(
                "Nested Primitive Type (str, int, bool, float, None)"
            ).add_trace(key, str(type(value)))

        if isinstance(value, dict):
            try:
                validate_primitive_data(value)
            except InvalidValueType as e:
                raise e.add_trace(key)
