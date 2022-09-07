from datetime import datetime
from peewee import CharField, ForeignKeyField, CompositeKey, TextField, IntegerField, BooleanField, DateTimeField
from osin.models.base import BaseModel


class Exp(BaseModel):
    name = CharField()
    description = TextField()


class ExpRun(BaseModel):
    exp = ForeignKeyField(Exp, backref="runs", on_delete="CASCADE")
    is_deleted = BooleanField(default=False, index=True)
    created_time = DateTimeField(default=datetime.now)