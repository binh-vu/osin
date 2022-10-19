from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Generic, List, Type, TypeVar

import numpy as np
import orjson
from osin.misc import orjson_dumps
from osin.types.primitive_type import NestedPrimitiveOutput
from osin.types.pyobject_type import PyObjectType

T = TypeVar("T", np.ndarray, bytes)


class PyObject(ABC, Generic[T]):
    def get_classpath(self) -> str:
        return PyObjectType.from_type_hint(self.__class__).path

    @staticmethod
    def from_classpath(classpath: str) -> Type[PyObject]:
        # we know that variants of pyobject must be member of this module
        return globals()[classpath.split(".")[-1]]

    @abstractmethod
    def serialize_hdf5(self) -> T:
        pass

    @staticmethod
    @abstractmethod
    def from_hdf5(value: T) -> PyObject:
        pass

    @abstractmethod
    def to_dict(self) -> dict:
        pass


@dataclass
class OTable(PyObject[bytes]):
    rows: List[NestedPrimitiveOutput]

    def serialize_hdf5(self) -> bytes:
        return orjson_dumps({"rows": self.rows})

    @staticmethod
    def from_hdf5(value: bytes) -> OTable:
        return OTable(**orjson.loads(value))

    def to_dict(self) -> dict:
        return {
            "type": "table",
            "rows": self.rows,
        }


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
