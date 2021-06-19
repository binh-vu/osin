import time
from datetime import datetime
from pathlib import Path

import sqlite3
from typing import Union
import threading

import pandas as pd


class Database:
    instances = {}

    """A database containing running results. Dynamic schema so that users don't need to define schema before.
    """

    def __init__(self, dbfile: Union[str, Path]):
        dbfile = Path(dbfile)
        dbfile.parent.mkdir(exist_ok=True, parents=True)
        self.connection = sqlite3.connect(dbfile, check_same_thread=False)
        self.lock = threading.RLock()
        with self.lock, self.connection:
            self.connection.execute(
                "CREATE TABLE IF NOT EXISTS RUNLOG(id INTEGER PRIMARY KEY AUTOINCREMENT, created_time REAL)")

    @staticmethod
    def get_instance(dbfile: str):
        if dbfile not in Database.instances:
            Database.instances[dbfile] = Database(dbfile)
        return Database.instances[dbfile]

    def to_dataframe(self) -> pd.DataFrame:
        """Convert the whole table into a single data frame"""
        with self.lock, self.connection:
            columns = [x[1] for x in self.connection.execute("PRAGMA table_info(RUNLOG)")]
            rows = list(self.connection.execute("SELECT * FROM RUNLOG"))
        df = pd.DataFrame(data=rows, columns=columns)
        df['created_time'] = [datetime.fromtimestamp(x) for x in df['created_time']]
        return df

    def add_run(self, run_output: dict):
        with self.lock:
            self._update_schema(run_output)
            with self.connection:
                data = run_output.items()
                names = ", ".join([x[0] for x in data])
                placeholder = ", ".join(["?"] * (len(run_output) + 1))
                self.connection.execute(f"INSERT INTO RUNLOG(created_time, {names}) VALUES({placeholder})",
                                        [time.time()] + [x[1] for x in data])

    def _update_schema(self, run_output: dict):
        with self.connection:
            cursor = self.connection.execute("PRAGMA table_info(RUNLOG)")
            columns = set([x[1] for x in cursor])
            for k, v in run_output.items():
                if isinstance(v, str):
                    type = "TEXT"
                elif isinstance(v, float):
                    type = "REAL"
                elif isinstance(v, int):
                    type = "INTEGER"
                else:
                    assert f"Doesn't support type: type(v) for column {k}"
                if k not in columns:
                    self.connection.execute(f"ALTER TABLE RUNLOG ADD COLUMN {k} {type};")

    def merge_column(self, column_1: str, column_2: str):
        with self.lock, self.connection:
            update_data = []
            for r in self.connection.execute(f"SELECT id, {column_1}, {column_2} FROM RUNLOG"):
                assert r[1] is None or r[2] is None, "Cannot overwrite existing data"
                if r[1] is None:
                    newval = r[2]
                else:
                    newval = r[1]
                update_data.append((newval, r[0]))

            # drop column 2
            cursor = list(self.connection.execute("PRAGMA table_info(RUNLOG)"))
            columns = ", ".join([x[1] for x in cursor if x[1] != column_2])
            assert cursor[0][1] == 'id'
            columns_def = ", ".join(
                ['id INTEGER PRIMARY KEY AUTOINCREMENT'] + [f'{x[1]} {x[2]}' for x in cursor[1:] if x[1] != column_2])
            self.connection.executescript(f"""
            CREATE TEMPORARY TABLE RUNLOG_BACKUP({columns});
            INSERT INTO RUNLOG_BACKUP SELECT {columns} FROM RUNLOG;
            DROP TABLE RUNLOG;
            CREATE TABLE RUNLOG({columns_def});
            INSERT INTO RUNLOG SELECT {columns} FROM RUNLOG_BACKUP;
            DROP TABLE RUNLOG_BACKUP;
            """)

            # re-insert data
            self.connection.executemany(f"UPDATE RUNLOG SET {column_1} = ? WHERE id = ?", update_data)


if __name__ == '__main__':
    db = Database.get_instance("/workspace/sm-dev/osin/osin.db")
    db.add_run({"method": "random_forest", "precision": 1, "recall": 0.5})
    db.add_run({"method": "random_forest", "precision": 3, "recall": 0.5, "f1": 0.2})
    db.add_run({"method": "random_forest", "precision": 2, "recall": 0.5, "f1_1": 0.6})
    db.merge_column("f1", "f1_1")
