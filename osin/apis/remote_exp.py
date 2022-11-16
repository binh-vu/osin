from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Dict, List, Optional, Union

from osin.params_helper import DataClassInstance
from osin.models import ExpRunData
from osin.types import (
    NestedPrimitiveOutput,
    ParamSchema,
    NestedPrimitiveOutputSchema,
    PyObject,
    PyObjectType,
)

if TYPE_CHECKING:
    from osin.apis.osin import Osin


@dataclass
class RemoteExp:
    id: int
    name: str
    version: int
    params: List[ParamSchema]
    aggregated_primitive_outputs: Optional[NestedPrimitiveOutputSchema]
    osin: Osin

    def new_exp_run(
        self, params: Union[DataClassInstance, List[DataClassInstance]]
    ) -> RemoteExpRun:
        return self.osin.new_exp_run(self, params)


@dataclass
class RemoteExpRun:
    # id to the experiment run in osin
    id: int
    # id to the experiment in osin
    exp: RemoteExp
    created_time: datetime
    finished_time: Optional[datetime]
    rundir: Path
    osin: Osin
    pending_output: ExpRunData = field(default_factory=ExpRunData)

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
