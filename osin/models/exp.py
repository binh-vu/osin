from datetime import datetime
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
from osin.models.base import BaseModel
from gena.custom_fields import DictDataClassField
from osin.models.parameters import PyObjectType


LiteralValue = Union[str, int, float, bool]
AggregatedOuput = Dict[str, Union[LiteralValue, "AggregatedOuput"]]


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
    aggregated_lit_outputs: Dict[str, PyObjectType] = DictDataClassField(PyObjectType)  # type: ignore


class ExpRun(BaseModel):
    id: int = AutoField()  # type: ignore
    exp: Union[int, Exp] = ForeignKeyField(Exp, backref="runs", on_delete="CASCADE")  # type: ignore
    is_deleted: bool = BooleanField(default=False, index=True)  # type: ignore
    is_finished: bool = BooleanField(default=False, index=True)  # type: ignore
    # whether the schema of the outputs is not consistent with the experiment.
    has_invalid_agg_output_schema: bool = BooleanField(default=False, index=True)  # type: ignore
    created_time: datetime = DateTimeField(default=datetime.now)  # type: ignore
    finished_time: datetime = DateTimeField(null=True)  # type: ignore
    rundir: str = TextField()  # type: ignore
    params: dict = JSONField(default={})  # type: ignore
    aggregated_lit_outputs: AggregatedOuput = JSONField(default={})  # type: ignore
