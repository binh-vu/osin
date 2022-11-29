from pathlib import Path
import sqlite3
import sys
from typing import Optional

import orjson


def identity(x):
    return x


def get_caller_python_script():
    """Determine the python script that starts the python program"""
    return sys.argv[0]


def json_dumps(obj):
    return orjson.dumps(obj, default=_orjson_default).decode()


def orjson_dumps(obj, **kwargs):
    return orjson.dumps(obj, default=_orjson_default, **kwargs)


def assert_not_null(obj):
    if obj is None:
        raise ValueError("expect a not-null object")
    return obj


def _orjson_default(obj):
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


class Directory:
    def __init__(self, root: Path, dirname: str = "directory"):
        self.root = root
        self.root.mkdir(exist_ok=True, parents=True)
        self.dbfile = root / "fs.db"
        self.dirname = dirname

        need_init = not self.dbfile.exists()
        self.db = sqlite3.connect(str(self.dbfile))
        if need_init:
            with self.db:
                self.db.execute("CREATE TABLE files(path, diskpath, key)")

    def create_directory(self, relpath: str, key: dict, save_key: bool = False) -> Path:
        """Create a directory at a virtual relpath with key if not exists. Otherwise, return
        the existing directory"""
        ser_key = orjson_dumps(key)
        if save_key:
            # serialize here to make sure we can dump it first otherwise, we may have create
            # the directory but fail to dump the key
            friendly_ser_key = orjson_dumps(key, option=orjson.OPT_INDENT_2)
        else:
            friendly_ser_key = b""

        with self.db:
            record = self.db.execute(
                "SELECT path, diskpath, key FROM files WHERE path = ? AND key = ?",
                (relpath, ser_key),
            ).fetchone()

            if record is None:
                last_id = self.db.execute("SELECT MAX(rowid) FROM files").fetchone()[0]
                if last_id is None:
                    last_id = 0
                dirname = f"{self.dirname}_{last_id + 1:03d}"
                self.db.execute(
                    "INSERT INTO files VALUES (?, ?, ?)", (relpath, dirname, ser_key)
                )
                dpath = self.root / dirname
                dpath.mkdir(exist_ok=False, parents=True)
                if save_key:
                    (dpath / "_KEY").write_bytes(friendly_ser_key)

                return dpath
            return self.root / record[1]


def get_extension(filename: str) -> Optional[str]:
    """Return the extension of a filename without the dot"""
    lst = filename.rsplit(".", 1)
    if len(lst) == 1:
        return None
    return lst[1].lower()
