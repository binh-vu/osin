from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import orjson
from typing import List, Union, Dict, get_type_hints, Type, Any
from dataclasses import is_dataclass, asdict, dataclass, fields, Field, replace
from ream.params_helper import DataClassInstance
from osin.types.pyobject_type import PyObjectType


def are_valid_parameters(
    params: Union[
        DataClassInstance, List[DataClassInstance], Dict[str, DataClassInstance]
    ]
):
    """Check if the parameters are valid"""
    if isinstance(params, list):
        return all(is_dataclass(param) for param in params)
    elif isinstance(params, dict):
        return all(
            isinstance(name, str) and is_dataclass(param)
            for name, param in params.items()
        )
    else:
        assert is_dataclass(params), "Parameters must be an instance of a dataclass"


class ParamComparison:
    MISSING_TOKEN = "__MISSING__"

    @staticmethod
    def compare_params(
        param1id: str | int,
        param1: Any,
        param2id: str | int,
        param2: Any,
    ) -> dict | list | None:
        """Compare two parameters that the value has been converted into python basic
        types (dict, list, tuple, set, and primitive types) and return the differences.

        This function works recursively but the first call should be with two dictionaries
        such as the values of ExpRun.params
        """
        if isinstance(param1, (str, int, float, bool, set)) or param1 is None:
            if param1 != param2:
                return ParamComparison.track_diff(param1id, param1, param2id, param2)
            return None

        if isinstance(param1, (list, tuple)):
            if not isinstance(param2, (list, tuple)):
                return ParamComparison.track_diff(param1id, param1, param2id, param2)

            diffs = []
            for index, (item1, item2) in enumerate(zip(param1, param2)):
                cmp_res = ParamComparison.compare_params(
                    param1id, item1, param2id, item2
                )
                if cmp_res is not None:
                    if isinstance(cmp_res, dict):
                        ParamComparison.augment_track_diff_with_seq_info(cmp_res, index)
                    else:
                        cmp_res = ParamComparison.track_nested_seq_diff(cmp_res, index)
                    diffs.append(cmp_res)
            len_param1 = len(param1)
            len_param2 = len(param2)
            for i in range(min(len_param1, len_param2), max(len_param1, len_param2)):
                if len_param1 < len_param2:
                    cmp_res = ParamComparison.track_diff(
                        param1id, ParamComparison.MISSING_TOKEN, param2id, param2[i]
                    )
                else:
                    cmp_res = ParamComparison.track_diff(
                        param1id, param1[i], param2id, ParamComparison.MISSING_TOKEN
                    )
                ParamComparison.augment_track_diff_with_seq_info(cmp_res, i)
                diffs.append(cmp_res)

            if len(diffs) == 0:
                return None
            return diffs

        if not isinstance(param1, dict):
            raise TypeError(f"Type {type(param1)} is not supported")

        if not isinstance(param2, dict):
            return ParamComparison.track_diff(param1id, param1, param2id, param2)

        output: dict[Any, Any] = {
            key: ParamComparison.track_diff(
                param1id, ParamComparison.MISSING_TOKEN, param2id, value
            )
            for key, value in param2.items()
            if key not in param1
        }
        for key, value in param1.items():
            if key not in param2:
                output[key] = ParamComparison.track_diff(
                    param1id, value, param2id, ParamComparison.MISSING_TOKEN
                )
                continue

            cmp_res = ParamComparison.compare_params(
                param1id, value, param2id, param2[key]
            )
            if cmp_res is not None:
                output[key] = cmp_res

        if len(output) == 0:
            return None
        return output

    @staticmethod
    def track_diff(
        param1id: str | int, param1value: Any, param2id: str | int, param2value: Any
    ) -> dict:
        """Get the diff indicator"""
        return {param1id: param1value, param2id: param2value}

    @staticmethod
    def augment_track_diff_with_seq_info(diff: dict, index: int):
        diff["type"] = "list"
        diff["item"] = index
        return diff

    @staticmethod
    def track_nested_seq_diff(diff: list, index: int) -> dict:
        """Get the diff indicator"""
        return {"type": "list", "index": index, "diff": diff}
