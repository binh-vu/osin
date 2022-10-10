from dataclasses import dataclass
from typing import Dict, Union

from osin.params_helper import get_param_types
from osin.types import PyObjectType


@dataclass
class NormalParams:
    a: str
    b: int


@dataclass
class DictParams:
    obj: Dict[str, int]
    value: Union[int, float]


def test_get_param_types():
    params = NormalParams(a="a", b=1)
    assert get_param_types(params) == {
        "a": PyObjectType(path="str", args=[]),
        "b": PyObjectType(path="int", args=[]),
    }

    params = DictParams(obj={"a": 1}, value=10.4)
    assert get_param_types(params) == {
        "obj": PyObjectType(
            path="dict",
            args=[
                PyObjectType(path="str", args=[]),
                PyObjectType(path="int", args=[]),
            ],
        ),
        "value": PyObjectType(
            path="typing.Union",
            args=[
                PyObjectType(path="int", args=[]),
                PyObjectType(path="float", args=[]),
            ],
        ),
    }
