from pathlib import Path
import sqlite3
import sys

import orjson


def get_caller_python_script():
    """Determine the python script that starts the python program"""
    return sys.argv[0]


def json_dumps(obj):
    return orjson.dumps(obj, default=_orjson_default).decode()


def orjson_dumps(obj, **kwargs):
    return orjson.dumps(obj, default=_orjson_default, **kwargs)


def _orjson_default(obj):
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


class Directory:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(exist_ok=True, parents=True)
        self.dbfile = root / "fs.db"

        need_init = not self.dbfile.exists()

        self.db = sqlite3.connect(str(self.dbfile))

        if need_init:
            with self.db:
                self.db.execute("CREATE TABLE files(id , path, diskpath, key)")

    def create_directory(self, relpath: str, key: dict) -> Path:
        ser_key = orjson_dumps(key)

        with self.db:
            record = self.db.execute(
                "SELECT path, diskpath, key FROM files WHERE path = ? AND key = ?",
                (relpath, ser_key),
            ).fetchone()

            if record is None:
                last_id = self.db.execute("SELECT MAX(rowid) FROM files").fetchone()[0]
                dirname = f"directory_{last_id + 1}"
                self.db.execute(
                    "INSERT INTO files VALUES (?, ?, ?)", (relpath, dirname, ser_key)
                )
                dpath = self.root / dirname
                dpath.mkdir(exist_ok=False, parents=True)
                return dpath
            return self.root / record[1]
