from __future__ import annotations

import os
import pickle
from contextlib import contextmanager
from functools import partial
from pathlib import Path
from typing import Any, Tuple, Union

import orjson
from hugedict.prelude import RocksDBDict, RocksDBOptions
from loguru import logger
from osin.actor_model.actor_state import ActorState
from osin.misc import Directory, orjson_dumps
from slugify import slugify


class CacheRepository:
    instance = None

    def __init__(self, cache_dir: Union[str, Path]):
        self.cache_dir = Path(cache_dir)
        self.directory = Directory(self.cache_dir)

    @staticmethod
    def get_instance() -> CacheRepository:
        if CacheRepository.instance is None:
            raise Exception("CacheRepository must be initialized before using")
        return CacheRepository.instance

    @staticmethod
    def init(cache_dir: Union[Path, str]):
        CacheRepository.instance = CacheRepository(cache_dir)
        return CacheRepository.instance

    def reserve_cache_dir(self, state: ActorState) -> Path:
        relpath = os.path.join(
            state.classpath, slugify(state.classversion).replace("-", "_")
        )
        key = state.to_dict()

        dir = self.directory.create_directory(relpath, key)
        if not (dir / "_KEY").exists():
            (dir / "_KEY").write_bytes(orjson_dumps(key, option=orjson.OPT_INDENT_2))
        return dir


class Cache:
    """Provide basic caching mechanisms:
    - key-value store: RocksDB database -- high performance, but
        not friendly with multiprocessing
    - file-based store: FileCache -- saving and loading results to files in two
        steps: the file itself and _SUCCESS to make sure the content is fully written to disk

    """

    @staticmethod
    def rocksdb(cache_dir: Path) -> "RocksDBDict[str, Any]":
        return RocksDBDict(
            path=str(cache_dir / "cache.db"),
            options=RocksDBOptions(create_if_missing=True),
            deser_key=partial(str, encoding="utf-8"),
            deser_value=pickle.loads,
            ser_value=pickle.dumps,
            readonly=False,
        )

    @staticmethod
    def file(cache_dir: Path) -> "FileCache":
        return FileCache(cache_dir)

    @staticmethod
    def dict(cache_dir: Path) -> dict:
        return dict()


class FileCache:
    def __init__(self, root: Path):
        self.root = root

    def has_file(self, filename: str):
        dpath = self.split_filename(filename)[0]
        return (dpath / "_SUCCESS").exists()

    @contextmanager
    def open_file(self, filename: str, mode: str = "rb"):
        dpath, fpath = self.split_filename(filename)
        dpath.mkdir(exist_ok=True, parents=True)
        with open(fpath, mode) as f:
            yield f

        (dpath / "_SUCCESS").touch()
        self._validate_structure(filename)

    @contextmanager
    def open_file_path(self, filename: str):
        dpath, fpath = self.split_filename(filename)
        dpath.mkdir(exist_ok=True, parents=True)

        yield fpath

        (dpath / "_SUCCESS").touch()
        self._validate_structure(filename)

    def get_file(self, filename: str) -> Path:
        if not self.has_file(filename):
            raise Exception(f"File {filename} does not exist")

        return self.split_filename(filename)[1]

    def split_filename(self, filename: str) -> Tuple[Path, Path]:
        ext = "".join(Path(filename).suffixes)
        dirname = filename[: -len(ext)]
        return self.root / dirname, self.root / dirname / f"dat{ext}"

    def _validate_structure(self, filename: str):
        dpath = self.split_filename(filename)[0]
        if dpath.exists():
            c1, c2 = 0, 0
            for file in dpath.iterdir():
                if file.name.startswith("_SUCCESS"):
                    c1 += 1
                elif file.name.startswith(f"dat."):
                    c2 += 1
            if c1 != 1 or c2 != 1:
                logger.warning(
                    "This class does not support files with same name but different extensions. Encounter in this folder: {}",
                    dpath,
                )
