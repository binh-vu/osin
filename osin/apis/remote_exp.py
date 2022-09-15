from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, TYPE_CHECKING, Optional, Union
from osin.models.exp import NestedPrimitiveOutput
from osin.models.parameters import (
    PyObject,
    PyObjectType,
    Parameters,
    NestedPrimitiveOutputSchema,
)

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

    def new_exp_run(self) -> RemoteExpRun:
        return self.osin.new_exp_run(self)


@dataclass
class PendingPrimitiveOutput:
    aggregated: NestedPrimitiveOutput = field(default_factory=dict)
    individual: Dict[str, NestedPrimitiveOutput] = field(default_factory=dict)


@dataclass
class PendingComplexOutput:
    aggregated: Dict[str, Any] = field(default_factory=dict)
    individual: Dict[str, Dict[str, Any]] = field(default_factory=dict)


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
    pending_primitive_output: PendingPrimitiveOutput = field(
        default_factory=PendingPrimitiveOutput
    )
    pending_complex_output: PendingComplexOutput = field(
        default_factory=PendingComplexOutput
    )

    def update_params(
        self, params: Union[Parameters, List[Parameters]]
    ) -> RemoteExpRun:
        self.osin.update_exp_run_params(self, params)
        return self

    def update_agg_primitive_output(self, output: NestedPrimitiveOutput):
        self.osin.update_exp_run_agg_primitive_output(self, output)
        return self

    def update_agg_complex_output(self, output: Dict[str, PyObject]):
        self.osin.update_exp_run_agg_complex_output(self, output)
        return self

    def update_example_primitive_output(
        self,
        example_id: str,
        example_name: str = "",
        output: Optional[NestedPrimitiveOutput] = None,
    ):
        self.osin.update_example_primitive_output(
            self, example_id, example_name, output
        )
        return self

    def update_example_complex_output(
        self,
        example_id: str,
        example_name: str = "",
        output: Optional[Dict[str, PyObject]] = None,
    ):
        self.osin.update_example_complex_output(self, example_id, example_name, output)
        return self

    def finish_exp_run(self):
        self.osin.finish_exp_run(self)
        return self
