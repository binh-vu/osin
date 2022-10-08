from __future__ import annotations

import os
import pickle
from contextlib import contextmanager
from functools import partial
from pathlib import Path
from typing import Any, Generator, Optional, Tuple, Union

import orjson
from hugedict.prelude import RocksDBDict, RocksDBOptions
from loguru import logger
from osin.actor_model.actor_state import ActorState
from osin.misc import Directory, orjson_dumps
from slugify import slugify
from filelock import FileLock, Timeout


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
        return self.directory.create_directory(relpath, key, save_key=True)


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
        self.lock: Optional[FileLock] = None

    def has_file(self, filename: str):
        dpath = self.split_filename(filename)[0]
        return (dpath / "_SUCCESS").exists()

    def has_folder(self, dirname: str):
        dpath = self.root / dirname
        return (dpath / "_SUCCESS").exists()

    @contextmanager
    def acquire_write_lock(self):
        """Acquire a write lock on the cache directory. You should use this before
        any attempt to write to the cache directory to prevent multiple processes
        from writing to the same directory at the same time.
        """
        if self.lock is None:
            self.lock = FileLock(self.root / "_LOCK")

        logger.trace(
            "[Process {}] Acquiring lock on cache directory: {}", os.getpid(), self.root
        )
        with self.lock.acquire(timeout=15):
            logger.trace(
                "[Process {}] Acquiring lock on cache directory: {}... SUCCESS!",
                os.getpid(),
                self.root,
            )
            yield

    @contextmanager
    def open_file(self, filename: str, mode: str = "rb"):
        dpath, fpath = self.split_filename(filename)
        dpath.mkdir(exist_ok=True, parents=True)
        with open(fpath, mode) as f:
            yield f

        (dpath / "_SUCCESS").touch()
        self._validate_structure(filename)

    @contextmanager
    def open_file_path(self, filename: str) -> Generator[Path, None, None]:
        dpath, fpath = self.split_filename(filename)
        dpath.mkdir(exist_ok=True, parents=True)

        yield fpath

        (dpath / "_SUCCESS").touch()
        self._validate_structure(filename)

    @contextmanager
    def open_folder_path(self, dirname: str):
        dpath = self.root / dirname
        Path(dpath).mkdir(exist_ok=True, parents=True)
        yield dpath
        (dpath / "_SUCCESS").touch()

    def get_file(self, filename: str) -> Path:
        if not self.has_file(filename):
            raise Exception(f"File {filename} does not exist")

        return self.split_filename(filename)[1]

    def get_folder(self, dirname: str) -> Path:
        if not self.has_folder(dirname):
            raise Exception(f"Folder {dirname} does not exist")

        return self.root / dirname

    def split_filename(self, filename: str) -> Tuple[Path, Path]:
        ext = "".join(Path(filename).suffixes)
        dirname = filename[: -len(ext)]
        return self.root / dirname, self.root / dirname / f"data{ext}"

    def get_parameterize_folder(
        self, relpath: str, dirname: str = "directory"
    ) -> Directory:
        return Directory(self.root / relpath, dirname)

    # def get_parameterize_folder(self, dirname: str, params: dict) -> Optional[Path]:
    #     dpath = self.root / dirname
    #     if not dpath.exists():
    #         return None

    #     key = orjson.dumps(params)
    #     for p in list(dpath.iterdir()):
    #         if (p / "_KEY").exists():
    #             if (p / "_KEY").read_bytes() == key:
    #                 return p
    #     return None

    # def reserve_parameterize_folder(self, dirname: str, params: dict) -> Path:
    #     dpath = self.root / dirname
    #     dpath.mkdir(exist_ok=True, parents=True)

    #     key = orjson.dumps(params)
    #     subdirs = [d for d in dpath.iterdir() if d.is_dir()]
    #     for p in subdirs:
    #         if (p / "_KEY").exists():
    #             if (p / "_KEY").read_bytes() == key:
    #                 return p
    #     newdir = dpath / ("args_" + str(len(subdirs)))
    #     newdir.mkdir(exist_ok=True, parents=True)
    #     (newdir / "_KEY").write_bytes(key)
    #     return newdir

    def _validate_structure(self, filename: str):
        dpath = self.split_filename(filename)[0]
        if dpath.exists():
            c1, c2 = 0, 0
            for file in dpath.iterdir():
                if file.name.startswith("_SUCCESS"):
                    c1 += 1
                elif file.name.startswith(f"data."):
                    c2 += 1
            if c1 != 1 or c2 != 1:
                logger.warning(
                    "This class does not support files with same name but different extensions. Encounter in this folder: {}",
                    dpath,
                )
