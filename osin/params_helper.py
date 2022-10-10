from copy import deepcopy
from pathlib import Path
import orjson
from typing import List, Union, Dict, get_type_hints, Type, Any
from dataclasses import is_dataclass, asdict, dataclass, fields, Field, replace

from osin.types.pyobject_type import PyObjectType

DataClassInstance = Any


def are_valid_parameters(
    params: Union[
        DataClassInstance, List[DataClassInstance], Dict[str, DataClassInstance]
    ]
):
    """Check if the parameters are valid"""
    if isinstance(params, list):
        return all(is_dataclass(param) for param in params)
    elif isinstance(params, dict):
        return all(
            isinstance(name, str) and is_dataclass(param)
            for name, param in params.items()
        )
    else:
        assert is_dataclass(params), "Parameters must be an instance of a dataclass"


def get_param_types(
    paramss: Union[DataClassInstance, List[DataClassInstance]]
) -> Dict[str, PyObjectType]:
    """Derive parameter types from a dataclass or a list of dataclasses"""
    if not isinstance(paramss, list):
        paramss = [paramss]

    output = {}
    for params in paramss:
        assert is_dataclass(params), "Parameters must be an instance of a dataclass"
        type_hints = get_type_hints(params.__class__)
        for name, hint in type_hints.items():
            if name in output:
                raise KeyError("Duplicate parameter name: {}".format(name))

            output[name] = PyObjectType.from_type_hint(hint)
    return output


def param_as_dict(param: DataClassInstance) -> dict:
    """Convert a dataclass to a dictionary"""
    if not is_dataclass(param):
        raise TypeError("Parameter must be an instance of a dataclass")

    if hasattr(param, "to_dict"):
        return param.to_dict()
    return asdict(param)
