from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
import os
import socket
from typing import Union, Dict
from peewee import (
    CharField,
    ForeignKeyField,
    CompositeKey,
    TextField,
    IntegerField,
    BooleanField,
    DateTimeField,
    AutoField,
)
from playhouse.sqlite_ext import JSONField
import psutil
from osin.models.base import BaseModel
from gena.custom_fields import DictDataClassField, DataClassField
from osin.models.parameters import PyObjectType, NestedPrimitiveOutputSchema


PrimitiveValue = Union[str, int, float, bool, None]
NestedPrimitiveOutput = Dict[str, Union[PrimitiveValue, "NestedPrimitiveOutput"]]


@dataclass
class RunMetadata:
    hostname: str
    n_cpus: int
    # in bytes
    memory_usage: int

    @staticmethod
    def auto():
        return RunMetadata(
            hostname=socket.gethostname(),
            n_cpus=psutil.cpu_count(),
            memory_usage=psutil.Process(os.getpid()).memory_info().rss,
        )

    def to_dict(self):
        return {
            "hostname": self.hostname,
            "n_cpus": self.n_cpus,
            "memory_usage": self.memory_usage,
        }


class Exp(BaseModel):
    class Meta:
        indexes = (
            (("name", "version"), True),
            (("name",), False),
        )

    id: int = AutoField()  # type: ignore
    name: str = CharField(null=False)  # type: ignore
    version: int = IntegerField(null=False)  # type: ignore
    description: str = TextField()  # type: ignore
    program: str = TextField()  # type: ignore
    params: Dict[str, PyObjectType] = DictDataClassField(PyObjectType)  # type: ignore
    aggregated_primitive_outputs: NestedPrimitiveOutputSchema = DataClassField(NestedPrimitiveOutputSchema, null=True)  # type: ignore


class ExpRun(BaseModel):
    id: int = AutoField()  # type: ignore
    exp: Union[int, Exp] = ForeignKeyField(Exp, backref="runs", on_delete="CASCADE")  # type: ignore
    is_deleted: bool = BooleanField(default=False, index=True)  # type: ignore
    is_finished: bool = BooleanField(default=False, index=True)  # type: ignore
    is_successful: bool = BooleanField(default=False, index=True)  # type: ignore
    # whether the schema of the outputs is not consistent with the experiment.
    has_invalid_agg_output_schema: bool = BooleanField(default=False, index=True)  # type: ignore
    created_time: datetime = DateTimeField(default=datetime.utcnow)  # type: ignore
    finished_time: datetime = DateTimeField(null=True)  # type: ignore
    rundir: str = TextField()  # type: ignore
    params: dict = JSONField(default={})  # type: ignore
    metadata: RunMetadata = DataClassField(RunMetadata, null=True)  # type: ignore
    aggregated_primitive_outputs: NestedPrimitiveOutput = JSONField(default={})  # type: ignore
