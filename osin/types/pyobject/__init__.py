from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Union, Sequence, Optional

import numpy as np
import orjson
from osin.misc import orjson_dumps
from osin.types.pyobject.base import PyObject
from osin.types.pyobject.html import OHTML, OListHTML


@dataclass
class OImage(PyObject[np.ndarray]):
    object: np.ndarray

    def serialize_hdf5(self) -> np.ndarray:
        raise NotImplementedError()

    @staticmethod
    def from_hdf5(value: np.ndarray) -> OImage:
        raise NotImplementedError()

    def to_dict(self) -> Any:
        raise NotImplementedError()


@dataclass
class OAudio(PyObject[np.ndarray]):
    object: np.ndarray

    def serialize_hdf5(self) -> np.ndarray:
        raise NotImplementedError()

    @staticmethod
    def from_hdf5(value: np.ndarray) -> OAudio:
        raise NotImplementedError()

    def to_dict(self) -> dict:
        raise NotImplementedError()


OTableRow = Mapping[str, Optional[Union[str, float, int, bool, OHTML, OListHTML]]]
OTableCellTypeToClass: dict[str, type[OHTML] | type[OListHTML]] = {
    "html": OHTML,
    "html-list": OListHTML,
}


@dataclass
class OTable(PyObject[bytes]):
    rows: Sequence[OTableRow]

    def serialize_hdf5(self) -> bytes:
        return orjson_dumps(
            {
                "rows": [
                    {
                        k: c.to_dict() if isinstance(c, PyObject) else c
                        for k, c in row.items()
                    }
                    for row in self.rows
                ],
            }
        )

    @staticmethod
    def from_hdf5(value: bytes) -> OTable:
        return OTable(
            [
                {
                    k: OTableCellTypeToClass[c["type"]].from_dict(c)
                    if isinstance(c, dict)
                    else c  # type: ignore
                    for k, c in row.items()
                }
                for row in orjson.loads(value)["rows"]
            ]
        )

    def to_dict(self) -> dict:
        if len(self.rows) == 0:
            header = []
        else:
            header = list(self.rows[0].keys())

        return {
            "type": "table",
            "header": header,
            "rows": [
                {
                    k: c.to_dict() if isinstance(c, PyObject) else c
                    for k, c in row.items()
                }
                for row in self.rows
            ],
        }


def from_classpath(classpath: str) -> type[PyObject]:
    # we know that variants of pyobject must be member of this module
    return globals()[classpath.split(".")[-1]]


PyObject.from_classpath = from_classpath
