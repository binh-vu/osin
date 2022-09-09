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
from osin.models.report import Report


class Dashboard(BaseModel):
    reports = ForeignKeyField(Report, backref="dashboard", on_delete="CASCADE")
    name = CharField()
    description = TextField()
