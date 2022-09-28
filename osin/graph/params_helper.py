from pathlib import Path
import orjson
from typing import List, TypeVar, Union, Dict, get_type_hints, Type
from dataclasses import is_dataclass, asdict

from osin.types.pyobject_type import PyObjectType

DataClass = TypeVar("DataClass", bound=Type)


class ParamsContainer:
    """ """

    def __post_init__(self):
        pass


def get_param_types(
    paramss: Union[DataClass, List[DataClass]]
) -> Dict[str, PyObjectType]:
    """Derive parameter types from a dataclass or a list of dataclasses"""
    if not isinstance(paramss, list):
        paramss = [paramss]

    output = {}
    for params in paramss:
        assert is_dataclass(params), "Parameters must be an instance of a dataclass"
        type_hints = get_type_hints(params)
        for name, hint in type_hints.items():
            if name in output:
                raise KeyError("Duplicate parameter name: {}".format(name))

            output[name] = PyObjectType.from_type_hint(hint)
    return output


def param_as_dict(param: Union[DataClass, Dict[str, DataClass]]) -> dict:
    """Convert a dataclass to a dictionary"""
    if isinstance(param, dict):
        return {k: param_as_dict(v) for k, v in param.items()}
    return asdict(param)


def param_as_json(param: Union[dict, DataClass]) -> bytes:
    """Convert a dataclass or its dictionary (pre-converted) to a JSON string"""
    if not isinstance(param, dict) or (
        len(param) > 0 and is_dataclass(next(iter(param.values())))
    ):
        param = param_as_dict(param)
    return orjson.dumps(param, default=_orjson_default)


def _orjson_default(obj):
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")
