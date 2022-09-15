from typing import Dict, Union

import orjson
from osin.models.parameters import Parameters, PyObjectType


class NormalParams(Parameters):
    a: str
    b: int


class DictParams(Parameters):
    obj: Dict[str, int]
    value: Union[int, float]

    def configure(self) -> None:
        self.add_argument("--obj", type=orjson.loads)
        self.add_argument(
            "--value",
            type=lambda string: float(string) if "." in string else int(string),
        )


def test_get_param_types():
    params = NormalParams().from_dict(dict(a="a", b=1))
    assert Parameters.get_param_types(params) == {
        "a": PyObjectType(path="str", args=[]),
        "b": PyObjectType(path="int", args=[]),
    }

    params = DictParams().parse_args(["--obj", '{"a": 1}', "--value", "10.4"])
    assert Parameters.get_param_types(params) == {
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
