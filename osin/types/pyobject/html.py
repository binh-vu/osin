from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import orjson
from osin.misc import orjson_dumps

from osin.types.pyobject.base import PyObject


@dataclass
class OHTML(PyObject[bytes]):
    value: str
    popover: Optional[str] = field(
        default=None,
        metadata={
            "help": "(optional) popover html to show when hovering over the HTML",
        },
    )

    def serialize_hdf5(self) -> bytes:
        return orjson_dumps([self.value, self.popover])

    @staticmethod
    def from_hdf5(value: bytes) -> OHTML:
        return OHTML(*orjson.loads(value))

    def to_dict(self) -> dict:
        return {
            "type": "html",
            "value": self.value,
            "popover": self.popover,
        }

    @staticmethod
    def from_dict(obj: dict):
        return OHTML(obj["value"], obj["popover"])


@dataclass
class OListHTML(PyObject[bytes]):
    items: list[OHTML]
    space: int = field(
        default=0,
        metadata={
            "help": "space between each item (in pixels)",
        },
    )

    def serialize_hdf5(self) -> bytes:
        return orjson_dumps(
            {
                "items": [(item.value, item.popover) for item in self.items],
                "space": self.space,
            },
        )

    @staticmethod
    def from_hdf5(value: bytes) -> OListHTML:
        obj = orjson.loads(value)
        return OListHTML(
            [OHTML(item["value"], item["popover"]) for item in obj["items"]],
            obj["space"],
        )

    def to_dict(self) -> dict:
        return {
            "type": "html-list",
            "items": [item.value for item in self.items],
            "popovers": [item.popover for item in self.items],
            "space": self.space,
        }

    @staticmethod
    def from_dict(obj: dict):
        return OListHTML(
            [
                OHTML(item, popover)
                for item, popover in zip(obj["items"], obj["popovers"])
            ],
            obj["space"],
        )
