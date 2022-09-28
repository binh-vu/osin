from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from dataclasses import dataclass
import os
from pathlib import Path
import pickle
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Type,
    Union,
)
from hugedict.prelude import RocksDBDict, RocksDBOptions
from loguru import logger
import orjson
from osin.misc import Directory, orjson_dumps
from slugify import slugify
from osin.graph.params_helper import DataClass, param_as_dict
from osin.types.pyobject_type import PyObjectType


@dataclass
class CacheId:
    """ """

    classpath: str
    classversion: str
    params: dict
    dependent_ids: List[CacheId]

    @staticmethod
    def get_cache_id(
        CLS: Type,
        args: Union[DataClass, Dict[str, DataClass]],
        version: Optional[str] = None,
        dependent_ids: Optional[List[CacheId]] = None,
    ) -> CacheId:
        """Compute a unique cache id"""
        if version is None:
            assert hasattr(CLS, "VERSION"), "Class must have a VERSION attribute"
            version = getattr(CLS, "VERSION")

        assert isinstance(version, str), "Version must be a string"

        classpath = PyObjectType.from_type_hint(CLS).path
        params_dict = param_as_dict(args)

        return CacheId(
            classpath=classpath,
            classversion=version,
            params=params_dict,
            dependent_ids=dependent_ids or [],
        )

    def reserve_cache_dir(self, cache_dir: Optional[Union[str, Path]] = None) -> Path:
        """Reserve a directory for this cache id"""
        if cache_dir is None:
            cache_repo = CacheRepository.get_instance()
        else:
            cache_repo = CacheRepository(cache_dir)
        return cache_repo.get_cache_directory(self)


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

    def get_cache_directory(self, cache_id: CacheId) -> Path:
        relpath = os.path.join(
            cache_id.classpath, slugify(cache_id.classversion).replace("-", "_")
        )
        if len(cache_id.dependent_ids) == 0:
            key = cache_id.params
        else:
            key = {
                "main": cache_id.params,
                "deps": [
                    self._get_nested_key(dep_id) for dep_id in cache_id.dependent_ids
                ],
            }
        dir = self.directory.create_directory(relpath, key)
        if not (dir / "_KEY").exists():
            (dir / "_KEY").write_bytes(
                orjson_dumps(
                    {
                        "classpath": cache_id.classpath,
                        "version": cache_id.classversion,
                        "key": key,
                    },
                    option=orjson.OPT_INDENT_2,
                )
            )
        return dir

    def _get_nested_key(self, dep_id: CacheId) -> dict:
        if len(dep_id.dependent_ids) != 0:
            extra = {
                "deps": [
                    self._get_nested_key(nested_dep_id)
                    for nested_dep_id in dep_id.dependent_ids
                ]
            }
        else:
            extra = {}
        return {
            "classpath": dep_id.classpath,
            "classversion": dep_id.classversion,
            "params": dep_id.params,
            **extra,
        }


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


class FileCache:
    def __init__(self, root: Path):
        self.root = root

    def has_file(self, filename: str):
        return (self.root / Path(filename).stem / "_SUCCESS").exists()

    @contextmanager
    def open_file(self, filename: str, mode: str = "rb"):
        tmp = Path(filename)
        dpath = self.root / tmp.stem
        ext = ".".join(tmp.suffixes)
        with open(dpath / f"dat.{ext}", mode) as f:
            yield f

        (dpath / "_SUCCESS").touch()
        self._validate_structure(filename)
        return (self.root / filename).exists() and (self.root / f"_SUCCESS").exists()

    def get_file(self, filename: str) -> Path:
        if not self.has_file(filename):
            raise Exception(f"File {filename} does not exist")

        tmp = Path(filename)
        dpath = self.root / tmp.stem
        ext = ".".join(tmp.suffixes)
        return dpath / f"dat.{ext}"

    def _validate_structure(self, filename: str):
        dpath = self.root / Path(filename).stem
        if dpath.exists():
            c1, c2 = 0, 0
            for file in dpath.iterdir():
                if file.name.startswith("_SUCCESS."):
                    c1 += 1
                elif file.name.startswith(f"dat."):
                    c2 += 1
            if c1 != 1 or c2 != 1:
                logger.warning(
                    "This class does not support files with same name but different extensions. Encounter in this folder: {}",
                    dpath,
                )
