from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Generic, List, TypeVar

import numpy as np
import orjson
from osin.types.primitive_type import NestedPrimitiveOutput

T = TypeVar("T", np.ndarray, bytes)


class PyObject(ABC, Generic[T]):
    @abstractmethod
    def serialize_hdf5(self) -> T:
        pass

    @staticmethod
    @abstractmethod
    def from_hdf5(value: T) -> PyObject:
        pass

    @abstractmethod
    def serialize_js(self) -> dict:
        pass


@dataclass
class OTable(PyObject[bytes]):
    object: List[NestedPrimitiveOutput]

    def serialize_hdf5(self) -> bytes:
        return orjson.dumps(self.object)

    @staticmethod
    def from_hdf5(value: bytes) -> OTable:
        return OTable(orjson.loads(value))

    def serialize_js(self) -> dict:
        return {
            "type": "table",
            "value": self.object,
        }


@dataclass
class OImage(PyObject[np.ndarray]):
    object: np.ndarray

    def serialize_hdf5(self) -> np.ndarray:
        raise NotImplementedError()

    @staticmethod
    def from_hdf5(value: np.ndarray) -> OImage:
        raise NotImplementedError()

    def serialize_js(self) -> Any:
        raise NotImplementedError()


@dataclass
class OAudio(PyObject[np.ndarray]):
    object: np.ndarray

    def serialize_hdf5(self) -> np.ndarray:
        raise NotImplementedError()

    @staticmethod
    def from_hdf5(value: np.ndarray) -> OAudio:
        raise NotImplementedError()

    def serialize_js(self) -> dict:
        raise NotImplementedError()
