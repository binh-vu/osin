from datetime import datetime

import pandas as pd
from peewee import *
from playhouse.sqlite_ext import JSONField

from osin.config import DBFILE

db = SqliteDatabase(DBFILE)


class ExpResult(Model):
    class Meta:
        database = db

    table = TextField(default="default")
    created_time = DateTimeField(default=datetime.now)
    data = JSONField()

    @staticmethod
    def as_dataframe(table_name: str="default") -> pd.DataFrame:
        """Convert the whole table into a single data frame"""
        with db.atomic():
            records = [dict(r.data, created_time=r.created_time) for r in ExpResult.select().where(ExpResult.table == table_name)]
            return pd.DataFrame(records)

    @staticmethod
    def merge_column(column_1: str, column_2: str, table_name: str="default"):
        with db.atomic():
            # TODO: do bulk update
            for r in ExpResult.select().where(ExpResult.table == table_name):
                if column_1 not in r.data and column_2 not in r.data:
                    continue
                assert r.data.get(column_1, None) is None or r.data.get(column_2, None) is None, "Can't overwrite existing data"
                if r.data.get(column_1, None) is None:
                    r.data[column_1] = r.data.get(column_2, None)
                if column_2 in r.data:
                    del r.data[column_2]
                r.save()


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


db.create_tables([ExpResult, Job])


# if __name__ == '__main__':
#     RunTable.create(data={"method": "random_forest", "precision": 1, "recall": 0.5})
#     RunTable.create(data={"method": "random_forest", "precision": 3, "recall": 0.5, "f1": 0.2})
#     RunTable.create(data={"method": "random_forest", "precision": 2, "recall": 0.5, "f1_1": 0.6})
#     RunTable.merge_column("f1", "f1_1")
#     print(RunTable.as_dataframe())
