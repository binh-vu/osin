from datetime import datetime
from peewee import (
    CharField,
    ForeignKeyField,
    CompositeKey,
    TextField,
    IntegerField,
    BooleanField,
    DateTimeField,
)
from osin.models.base import BaseModel
from osin.models.exp import Exp
from osin.models.dashboard import Dashboard


class Report(BaseModel):
    exp = ForeignKeyField(Exp, backref="reports", on_delete="CASCADE")
    dashboard = ForeignKeyField(Dashboard, backref="reports", on_delete="CASCADE")
    name = CharField()
    description = TextField()
    type = TextField(choices=["table"])
