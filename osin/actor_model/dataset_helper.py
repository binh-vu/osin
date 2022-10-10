from __future__ import annotations
from pathlib import Path
import re
from abc import abstractmethod
from typing import Any, TypedDict, Dict, Optional, Tuple, List
from loguru import logger
from osin.actor_model.base_actor import BaseActor, E, P
from dataclasses import dataclass
from osin.misc import Directory
from sm.misc import CacheMethod


RawSlice = TypedDict("Slice", value=int, is_percentage=bool, absolute_value=int)


@dataclass
class DatasetSelection:
    dataset: str
    subsets: Dict[str, Tuple[RawSlice, RawSlice]]
    shuffle: bool
    seed: Optional[int]

    @staticmethod
    def from_string(spec: str) -> DatasetSelection:
        subsets = {}
        for subset in spec.split("+"):
            m = re.match(
                r"^(?P<sname>[^\[]]*)\[(?P<start>\d+\%?)?:(?P<end>\d+\%?)\]", subset
            )
            assert m is not None, f"Invalid subset spec: {subset}"
            slices = []
            for name in ["end", "start"]:
                if name == "start" and m.group(name) is None:
                    slices.append(
                        {
                            "value": 0,
                            "is_percentage": slices[-1]["is_percentage"],
                            "absolute_value": 0,
                        }
                    )
                    continue
                value = m.group(name)
                is_percentage = value.endswith("%")
                if is_percentage:
                    value = int(value[:-1]) / 100
                else:
                    value = int(value)
                slices.append(
                    {
                        "value": value,
                        "is_percentage": is_percentage,
                        "absolute_value": value,
                    }
                )

            assert (
                len({x["is_percentage"] for x in slices}) == 1
            ), f"Slices must be either percentage or absolute: {slices}"

            start = slices[1]
            end = slices[0]
            subsets[m.group("sname")] = (start, end)

        return DatasetSelection(subsets)

    @staticmethod
    def split_dataset_and_selection(ds_and_spec: str) -> Tuple[str, str]:
        m = re.match(r"^(?P<ds>[^:\[]+):?(?P<spec>.*)$", ds_and_spec)
        assert m is not None, f"Invalid dataset spec: {ds_and_spec}"
        return m.group("ds"), m.group("spec")

    @staticmethod
    def from_dataset_and_selection_string(
        ds_and_spec: str,
    ) -> Tuple[str, DatasetSelection]:
        ds, spec = DatasetSelection.split_dataset_and_selection(ds_and_spec)
        return ds, DatasetSelection.from_string(spec)

    def select(self, array: list) -> Dict[str, list]:
        n_exs = len(array)

        if all(start["is_percentage"] for (start, end) in self.subsets.values()):
            # convert percentage to absolute
            for (start, end) in self.subsets.values():
                start["absolute_value"] = int(start["value"] * n_exs)
                end["absolute_value"] = int(end["value"] * n_exs)

            total_percentage = sum(
                [end["value"] - start["value"] for start, end in self.subsets.values()]
            )
            n_selected = sum(
                [
                    end["absolute_value"] - start["absolute_value"]
                    for start, end in self.subsets.values()
                ]
            )
            if total_percentage == 100 and n_selected != n_exs:
                logger.debug(
                    "Total percentage is 100%, but the number of selected examples do not match, adjusting the first subset"
                )
                assert n_selected < n_exs
                for i, (start, end) in enumerate(self.subsets.values()):
                    if i != 0:
                        start["absolute_value"] += n_exs - n_selected
                    end["absolute_value"] += n_exs - n_selected
                assert n_exs == sum(
                    [
                        end["absolute_value"] - start["absolute_value"]
                        for start, end in self.subsets.values()
                    ]
                )

        return {
            subset: array[start["absolute_value"] : end["absolute_value"]]
            for subset, (start, end) in self.subsets.items()
        }

    def get_subset_disk_names(self) -> Dict[str, str]:
        return {
            name: "_empty" if name is None else name for name in self.subsets.keys()
        }
