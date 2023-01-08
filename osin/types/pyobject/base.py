from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, Type, TypeVar

import numpy as np
from osin.types.pyobject_type import PyObjectType

T = TypeVar("T", np.ndarray, bytes)


class PyObject(ABC, Generic[T]):
    def get_classpath(self) -> str:
        return PyObjectType.from_type_hint(self.__class__).path

    @staticmethod
    def from_classpath(classpath: str) -> Type[PyObject]:
        # we know that variants of pyobject must be member of this module
        raise Exception(
            "Unreachable! This function must be overrided in the module init"
        )

    @abstractmethod
    def serialize_hdf5(self) -> T:
        """Convert the object to a format that can be stored in HDF5."""
        pass

    @staticmethod
    @abstractmethod
    def from_hdf5(value: T) -> PyObject:
        """Convert the object from a value stored in HDF5."""
        pass

    @abstractmethod
    def to_dict(self) -> dict:
        """Convert the object to a dictionary to send to the client (browser)."""
        pass
