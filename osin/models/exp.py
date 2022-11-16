from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
import os
import socket
from peewee import (
    CharField,
    ForeignKeyField,
    TextField,
    IntegerField,
    BooleanField,
    DateTimeField,
    AutoField,
)
from playhouse.sqlite_ext import JSONField
import psutil
from osin.models.base import BaseModel
from osin.misc import json_dumps
from gena.custom_fields import DataClassField, ListDataClassField
from osin.types import (
    NestedPrimitiveOutput,
    NestedPrimitiveOutputSchema,
    ParamSchema,
)


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
    params: list[ParamSchema] = ListDataClassField(ParamSchema)  # type: ignore
    aggregated_primitive_outputs: NestedPrimitiveOutputSchema = DataClassField(NestedPrimitiveOutputSchema, null=True)  # type: ignore


class ExpRun(BaseModel):
    id: int = AutoField()  # type: ignore
    exp: Exp = ForeignKeyField(Exp, backref="runs", on_delete="CASCADE")  # type: ignore
    is_deleted: bool = BooleanField(default=False, index=True)  # type: ignore
    is_finished: bool = BooleanField(default=False, index=True)  # type: ignore
    is_successful: bool = BooleanField(default=False, index=True)  # type: ignore
    # whether the schema of the outputs is not consistent with the experiment.
    has_invalid_agg_output_schema: bool = BooleanField(default=False, index=True)  # type: ignore
    created_time: datetime = DateTimeField(default=datetime.utcnow)  # type: ignore
    finished_time: datetime = DateTimeField(null=True)  # type: ignore
    params: dict = JSONField(default={}, json_dumps=json_dumps)  # type: ignore
    metadata: RunMetadata = DataClassField(RunMetadata, null=True)  # type: ignore
    aggregated_primitive_outputs: NestedPrimitiveOutput = JSONField(default={}, json_dumps=json_dumps)  # type: ignore

    exp_id: int
