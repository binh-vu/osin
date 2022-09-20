from typing import Dict, List, Union
from osin.types import PyObjectType


def test_from_type_hint():
    assert PyObjectType.from_type_hint(str) == PyObjectType(path="str", args=[])
    assert PyObjectType.from_type_hint(int) == PyObjectType(path="int", args=[])
    assert PyObjectType.from_type_hint(List[float]) == PyObjectType(
        path="list",
        args=[
            PyObjectType(path="float", args=[]),
        ],
    )
    assert PyObjectType.from_type_hint(Dict[str, List[int]]) == PyObjectType(
        path="dict",
        args=[
            PyObjectType(path="str", args=[]),
            PyObjectType(
                path="list",
                args=[
                    PyObjectType(path="int", args=[]),
                ],
            ),
        ],
    )
    assert PyObjectType.from_type_hint(
        Union[int, Dict[str, List[int]]]
    ) == PyObjectType(
        path="typing.Union",
        args=[
            PyObjectType(path="int", args=[]),
            PyObjectType(
                path="dict",
                args=[
                    PyObjectType(path="str", args=[]),
                    PyObjectType(
                        path="list",
                        args=[
                            PyObjectType(path="int", args=[]),
                        ],
                    ),
                ],
            ),
        ],
    )
