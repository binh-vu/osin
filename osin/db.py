from datetime import datetime
from typing import List, Optional

import pandas as pd
from peewee import *
from playhouse.sqlite_ext import JSONField
from operator import attrgetter
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


db.create_tables([ExpResult, Job])


if __name__ == '__main__':
    Job.recent_jobs(0, 10)
#     RunTable.create(data={"method": "random_forest", "precision": 1, "recall": 0.5})
#     RunTable.create(data={"method": "random_forest", "precision": 3, "recall": 0.5, "f1": 0.2})
#     RunTable.create(data={"method": "random_forest", "precision": 2, "recall": 0.5, "f1_1": 0.6})
#     RunTable.merge_column("f1", "f1_1")
#     print(RunTable.as_dataframe())
