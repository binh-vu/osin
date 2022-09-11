from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, TYPE_CHECKING, Union
from osin.models.parameters import PyObjectType, Parameters

if TYPE_CHECKING:
    from osin.apis.osin import Osin


@dataclass
class RemoteExp:
    id: int
    name: str
    version: int
    params: Dict[str, PyObjectType]
    aggregated_outputs: Dict[str, PyObjectType]
    osin: Osin

    def new_exp_run(self) -> RemoteExpRun:
        return self.osin.new_exp_run(self)


@dataclass
class RemoteExpRun:
    # id to the experiment run in osin
    id: int
    # id to the experiment in osin
    exp: RemoteExp
    rundir: Path
    osin: Osin
    pending_literal_output: Dict[str, Any] = field(default_factory=dict)
    pending_complex_output: Dict[str, Any] = field(default_factory=dict)

    def update_params(
        self, params: Union[Parameters, List[Parameters]]
    ) -> RemoteExpRun:
        self.osin.update_exp_run_params(self, params)
        return self
