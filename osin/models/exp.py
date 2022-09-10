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


class Exp(BaseModel):
    class Meta:
        indexes = (
            (("name", "version"), True),
            (("name",), False),
        )

    id: int = AutoField()  # type: ignore
    name: str = CharField(null=False)  # type: ignore
    version: int = IntegerField(null=False)  # type: ignore
    description: int = TextField()  # type: ignore
    params: Dict[str, PyObjectType] = DictDataClassField(PyObjectType)  # type: ignore


class ExpRun(BaseModel):
    id: int = AutoField()  # type: ignore
    exp: Union[int, Exp] = ForeignKeyField(Exp, backref="runs", on_delete="CASCADE")  # type: ignore
    is_deleted: bool = BooleanField(default=False, index=True)  # type: ignore
    is_finished: bool = BooleanField(default=False, index=True)  # type: ignore
    created_time: datetime = DateTimeField(default=datetime.now)  # type: ignore
    finished_time: datetime = DateTimeField(null=True)  # type: ignore
    rundir: str = TextField()  # type: ignore
    params: dict = JSONField(default={})  # type: ignore
    aggregated_outputs: Dict[str, Union[int, str, float, bool]] = JSONField(default={})  # type: ignore
