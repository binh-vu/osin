from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Optional, Sequence, Union

import numpy as np
import orjson
from htbuilder import li, table, tbody, td, th, thead, tr, ul
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

    def _repr_html_(self):
        if len(self.rows) == 0:
            return "<i>&lt;empty table&gt;</i>"

        headers = list(self.rows[0].keys())
        rows = []
        for row in self.rows:
            cells = []
            for i, key in enumerate(row.keys()):
                assert key == headers[i]
                value = row[key]
                if isinstance(value, (OHTML, OListHTML)):
                    value = value._repr_html_()

                cells.append(td(value))
            rows.append(tr(*cells))
        return str(table(thead(tr(*(th(header) for header in headers))), tbody(*rows)))


def from_classpath(classpath: str) -> type[PyObject]:
    # we know that variants of pyobject must be member of this module
    return globals()[classpath.split(".")[-1]]


def from_dict(obj: dict):
    if obj["type"] == "table":
        return OTable(
            [
                {k: from_dict(c) if isinstance(c, dict) else c for k, c in row.items()}
                for row in obj["rows"]
            ]
        )
    elif obj["type"] == "html":
        return OHTML(obj["value"], obj["popover"])
    elif obj["type"] == "html-list":
        return OListHTML(
            [
                OHTML(item, popover)
                for item, popover in zip(obj["items"], obj["popovers"])
            ],
            obj["space"],
        )
    else:
        raise NotImplementedError(obj["type"])


PyObject.from_classpath = from_classpath
PyObject.from_dict = from_dict
