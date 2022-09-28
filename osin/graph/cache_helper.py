from __future__ import annotations
from functools import partial
import hashlib
from dataclasses import dataclass
import os
from pathlib import Path
import shutil
from typing import Any, Callable, Dict, Generic, List, Optional, Tuple, Type, Union
from hugedict.hugedict.rocksdb import RocksDBDict
import orjson
from osin.misc import Directory, orjson_dumps
from slugify import slugify
from osin.graph.params_helper import DataClass, param_as_json, param_as_dict
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
    def get_instance(cache_dir: Optional[Union[Path, str]] = None) -> CacheRepository:
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

    # def get_cache_directory_v1(self, cache_id: CacheId) -> Path:
    #     classpath_parts = cache_id.classpath.split(".")
    #     classpath_dir = self._get_directory(
    #         self.cache_dir,
    #         get_dirname=self._update_classpath_dirname,
    #         dirname_state={"parts": classpath_parts, "i": 0},
    #         key={"classpath": cache_id.classpath},
    #     )
    #     classpath_dir.mkdir(exist_ok=True, parents=True)

    #     version = slugify(cache_id.classversion).replace("-", "_")
    #     params_dir = self._get_directory(
    #         classpath_dir,
    #         get_dirname=self._update_param_dirname,
    #         dirname_state={"name": version + "__" + cache_id.params_pseudo_key, "i": 0},
    #         key={"params": cache_id.params},
    #     )
    #     params_dir.mkdir(exist_ok=True, parents=True)

    #     assert len(cache_id.dependent_ids) == 0
    #     # names = []
    #     # for dep_id in cache_id.dependent_ids:
    #     #     dep_version = slugify(dep_id.classversion).replace("-", "_")
    #     #     dep_dirname = dep_version + "__" + dep_id.params_pseudo_key

    #     return params_dir

    # def _update_classpath_dirname(self, state: dict):
    #     i = state["i"]
    #     if i <= -len(state["parts"]):
    #         raise Exception("Encounter a bug.")
    #     i -= 1
    #     return "__".join(state["parts"][i:]), state

    # def _update_param_dirname(self, state: dict):
    #     if state["i"] == 0:
    #         state["i"] += 1
    #         return state["name"], state

    #     state["i"] += 1
    #     return state["name"] + "_" + str(state["i"]), state

    # def _get_directory(
    #     self,
    #     parent: Path,
    #     get_dirname: Callable[[Any], Tuple[str, Any]],
    #     dirname_state: Any,
    #     key: dict,
    # ) -> Path:
    #     """Create a directory inside parent folder. If the key is different,
    #     try to change dirname.
    #     """
    #     # important to convert key to json before comparing because
    #     # when we reload json, Path object will be converted to string
    #     ser_key = param_as_json(key)

    #     dirname, dirname_state = get_dirname(dirname_state)
    #     while True:
    #         key_file = parent / dirname / "_KEY"
    #         if (parent / dirname).exists():
    #             if not key_file.exists():
    #                 # broken folder, so we clean it
    #                 shutil.rmtree(parent / dirname)
    #                 continue

    #             if key_file.read_bytes() == ser_key:
    #                 return parent / dirname
    #             else:
    #                 # we have to try a new dirname
    #                 dirname, dirname_state = get_dirname(dirname_state)
    #                 continue
    #         else:
    #             (parent / dirname).mkdir(parents=True)
    #             key_file.write_bytes(ser_key)
    #             return parent / dirname
