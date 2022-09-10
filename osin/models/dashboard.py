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


class Dashboard(BaseModel):
    name = CharField()
    description = TextField()
