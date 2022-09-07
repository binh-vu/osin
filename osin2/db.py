from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Dict

import orjson
import pandas as pd
from peewee import *
from playhouse.sqlite_ext import JSONField

from osin.config import DBFILE

db = SqliteDatabase(DBFILE)


class ExpResult(Model):
    class Meta:
        database = db

    is_deleted = BooleanField(default=False, index=True)
    table = TextField(default="default", index=True)
    created_time = DateTimeField(default=datetime.now)
    data = JSONField()

    @staticmethod
    def as_dataframe(table_name: str = "default") -> pd.DataFrame:
        """Convert the whole table into a single data frame"""
        with db.atomic():
            records = [dict(r.data, created_time=r.created_time) for r in
                       ExpResult.select().where(ExpResult.table == table_name)]
            return pd.DataFrame(records)

    @staticmethod
    def merge_column(column_1: str, column_2: str, table_name: str = "default"):
        with db.atomic():
            # TODO: do bulk update
            for r in ExpResult.select().where(ExpResult.table == table_name):
                if column_1 not in r.data and column_2 not in r.data:
                    continue
                assert r.data.get(column_1, None) is None or r.data.get(column_2,
                                                                        None) is None, "Can't overwrite existing data"
                if r.data.get(column_1, None) is None:
                    r.data[column_1] = r.data.get(column_2, None)
                if column_2 in r.data:
                    del r.data[column_2]
                r.save()


@dataclass
class ColumnSchema:
    count: int = 0
    visibility: bool = True
    type: str = "auto"
    format: List[str] = field(default_factory=list)

    @staticmethod
    def deserialize(bin):
        odicts = orjson.loads(bin)
        return {key: ColumnSchema(**value) for key, value in odicts.items()}

    @staticmethod
    def serialize(cols):
        return orjson.dumps({key: asdict(value) for key, value in cols.items()})


class ExpTableSchema(Model):
    class Meta:
        database = db

    table = TextField(unique=True)
    version = IntegerField(default=0)
    columns: Dict[str, ColumnSchema] = JSONField(default={}, json_loads=ColumnSchema.deserialize,
                                                 json_dumps=ColumnSchema.serialize)

    @staticmethod
    def get_table(table: str) -> 'ExpTableSchema':
        return ExpTableSchema.get(ExpTableSchema.table == table)

    def add_exp_result(self, exp_result: dict):
        """Recording that a new exp result has been added"""
        new_version = False
        for key in exp_result:
            if key not in self.columns:
                new_version = True
                self.columns[key] = ColumnSchema()
            self.columns[key].count += 1
        if new_version:
            self.version += 1

    def remove_exp_result(self, exp_result: dict):
        new_version = False
        for key in exp_result:
            self.columns[key].count -= 1
            if self.columns[key].count == 0:
                new_version = True
                del self.columns[key]
        if new_version:
            self.version += 1

    def to_dict(self):
        columns = {}
        if self.columns is not None:
            columns = {k: asdict(v) for k, v in self.columns.items()}
        return {
            "version": self.version,
            "table": self.table,
            "columns": columns
        }


class Job(Model):
    class Meta:
        database = db

    created_time = DateTimeField(default=datetime.now, index=True)
    start_time = DateTimeField(null=True, default=None)
    exec_type = TextField(choices=["bash"])
    exec_init_args = JSONField()
    exec_run_args = JSONField()
    hostname = TextField(null=True)
    pid = TextField(null=True)
    logfile = TextField(null=True)
    status = TextField(choices=["queueing", "started", "success", "failure"], index=True)

    @staticmethod
    def last_finished_job() -> int:
        jobs = Job.select(Job.id).where(Job.status.in_(['failure', 'success'])).order_by(Job.id.desc()).limit(1)
        jobs = list(jobs)
        if len(jobs) == 0:
            return 0
        else:
            return jobs[0].id

    @staticmethod
    def get_running_jobs() -> List['Job']:
        cursor = Job.select() \
            .where(Job.status.in_(['queueing', 'started'])) \
            .order_by(Job.id.desc())
        return list(cursor)

    def is_queueing(self):
        return self.status == "queueing"

    def is_started(self):
        return self.status == "started"


def init_db():
    db.create_tables([ExpResult, ExpTableSchema, Job])


if __name__ == '__main__':
    init_db()
