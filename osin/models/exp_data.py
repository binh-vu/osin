from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

from osin.types import NestedPrimitiveOutput, PyObject


@dataclass
class Record:
    primitive: NestedPrimitiveOutput = field(default_factory=dict)
    complex: Dict[str, PyObject] = field(default_factory=dict)

    def to_dict(self):
        return {
            "primitive": self.primitive,
            "complex": {k: v.to_dict() for k, v in self.complex.items()},
        }


@dataclass
class ExampleData:
    id: str
    name: str
    data: Record = field(default_factory=Record)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "data": self.data.to_dict(),
        }


@dataclass
class ExpRunData:
    aggregated: Record = field(default_factory=Record)
    individual: Dict[str, ExampleData] = field(default_factory=dict)

    def to_dict(self):
        return {
            "aggregated": self.aggregated.to_dict(),
            "individual": [v.to_dict() for k, v in self.individual.items()],
        }
