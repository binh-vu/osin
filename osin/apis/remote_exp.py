from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, TYPE_CHECKING, Optional, Union
from osin.models.exp import NestedPrimitiveOutput
from osin.types import Parameters, NestedPrimitiveOutputSchema, PyObject, PyObjectType

if TYPE_CHECKING:
    from osin.apis.osin import Osin


@dataclass
class RemoteExp:
    id: int
    name: str
    version: int
    params: Dict[str, PyObjectType]
    aggregated_primitive_outputs: Optional[NestedPrimitiveOutputSchema]
    osin: Osin

    def new_exp_run(self, params: Union[Parameters, List[Parameters]]) -> RemoteExpRun:
        return self.osin.new_exp_run(self, params)


@dataclass
class OutputType:
    primitive: NestedPrimitiveOutput = field(default_factory=dict)
    complex: Dict[str, PyObject] = field(default_factory=dict)


@dataclass
class ExampleOutput:
    id: str
    name: str
    output: OutputType


@dataclass
class PendingOutput:
    aggregated: OutputType = field(default_factory=OutputType)
    individual: Dict[str, ExampleOutput] = field(default_factory=dict)


@dataclass
class RemoteExpRun:
    # id to the experiment run in osin
    id: int
    # id to the experiment in osin
    exp: RemoteExp
    created_time: datetime
    finished_time: datetime
    rundir: Path
    osin: Osin
    pending_output: PendingOutput = field(default_factory=PendingOutput)

    def update_output(
        self,
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        self.osin.update_exp_run_output(self, primitive, complex)
        return self

    def update_example_output(
        self,
        example_id: str,
        example_name: str = "",
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        self.osin.update_example_output(
            self, example_id, example_name, primitive=primitive, complex=complex
        )
        return self

    def finish(self):
        self.osin.finish_exp_run(self)
        return self
