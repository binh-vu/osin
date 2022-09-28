import functools
from pathlib import Path
from typing import Mapping, TypeVar, Type, Callable, Any, Union

import orjson
from peewee import SqliteDatabase, Model, Field

from osin.config import CACHE_SIZE
from osin.graph.params_helper import _orjson_default


# TODO: consider moving to APSWDatabase
db = SqliteDatabase(None)
is_inited = False


def init_db(dbfile: Union[str, Path]):
    """Initialize database"""
    global db, is_inited
    if is_inited:
        return

    db.init(str(dbfile), pragmas={"foreign_keys": 1})
    is_inited = True


class BaseModel(Model):
    class Meta:
        database = db


class ClassField(Field):
    field_type = "BLOB"

    def __init__(self, cls, **kwargs):
        super().__init__(**kwargs)
        self.db_value = getattr(cls, "db_value")
        self.python_value = getattr(cls, "python_value")


class BlobField(Field):
    field_type = "BLOB"

    def __init__(self, serialize, deserialize, **kwargs):
        super().__init__(**kwargs)
        self.db_value = serialize
        self.python_value = deserialize
