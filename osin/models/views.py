from osin.misc import json_dumps
from osin.models.base import BaseModel
from osin.models.exp import Exp
from peewee import (
    ForeignKeyField,
    AutoField,
)
from playhouse.sqlite_ext import JSONField


class ExpRunView(BaseModel):
    id: int = AutoField()  # type: ignore
    exp = ForeignKeyField(Exp, on_delete="CASCADE")
    config: dict = JSONField(default={}, json_dumps=json_dumps)  # type: ignore
