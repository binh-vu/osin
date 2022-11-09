from dataclasses import dataclass
import math, numpy as np
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    Generic,
    Literal,
    Optional,
    Set,
    Tuple,
    TypeVar,
    Union,
)

from numpy import sort
from osin.models import ExpRunData, ExampleData, Record
from osin.types import NestedPrimitiveOutput, PyObject
from h5py import Group, File, Empty


class Hdf5Format:
    """An interface for storing experiment data"""

    def save_run_data(self, data: ExpRunData, outfile: Union[Path, str]):
        """Save the experiment run data to the file"""
        with File(outfile, "a") as f:
            self._update_nested_primitive_object(
                f.create_group("/aggregated/primitive", track_order=True),
                data.aggregated.primitive,
            )

            grp = f.create_group("/aggregated/complex", track_order=True)
            for key, value in data.aggregated.complex.items():
                self._validate_key(key)
                grp[key] = value.serialize_hdf5()
                grp.attrs[key] = value.get_classpath()

            ind_group = f.create_group("/individual", track_order=True)
            for (
                example_id,
                example,
            ) in data.individual.items():
                self._validate_key(example_id)
                ex_group = ind_group.create_group(example_id, track_order=True)
                ex_group.attrs["id"] = example.id
                ex_group.attrs["name"] = example.name

                self._update_nested_primitive_object(
                    ex_group.create_group("primitive", track_order=True),
                    example.data.primitive,
                )

                grp = ex_group.create_group(f"complex", track_order=True)
                for key, obj in example.data.complex.items():
                    self._validate_key(key)
                    grp[key] = obj.serialize_hdf5()
                    grp.attrs[key] = obj.get_classpath()

    def load_exp_run_data(
        self,
        infile: Union[Path, str],
        fields: Optional[Dict[str, Set[str]]] = None,
        limit: int = -1,
        offset: int = 0,
        sorted_by: Optional[str] = None,
        sorted_order: Literal["ascending", "descending"] = "ascending",
    ) -> Tuple[ExpRunData, int]:
        """Load experiment run data from a file.

        Args:
            infile: The file to load from
            fields: A dictionary of fields to load. If None, load all fields
            limit: The maximum number of individual records to load. If -1, load all records. Only apply to `individual` property
            offset: The offset to start loading from. Only apply to `individual` property
            sorted_by: The field to sort by. Only apply to `individual` property. Support either: id, name, or `data.<nested_field>` where `nested_field` is a field in the primitive or complex object
            sorted_order: The order to sort by. Only apply to `individual` property
        """
        if fields is None:
            fields = {
                "aggregated": {"primitive", "complex"},
                "individual": {"primitive", "complex"},
            }

        expdata = ExpRunData()
        with File(infile, "r") as f:
            if "aggregated" in fields:
                group = f["aggregated"]
                if "primitive" in fields["aggregated"]:
                    expdata.aggregated.primitive = self._load_nested_primitive_object(
                        group["primitive"]
                    )
                if "complex" in fields["aggregated"]:
                    for key, value in group["complex"].items():
                        pyobject_class = PyObject.from_classpath(group.attrs[key])
                        expdata.aggregated.complex[key] = pyobject_class.from_hdf5(
                            value[()]
                        )
            if "individual" in fields:
                if limit <= 0 and offset == 0 and sorted_by is None:
                    # select all without sorting
                    selected_examples = f["individual"].items()
                elif sorted_by is None:
                    if limit <= 0:
                        limit = math.inf  # type: ignore
                    # select some, no need to sort
                    selected_examples = []
                    for i, (key, ex_group) in enumerate(f["individual"].items()):
                        if i < offset:
                            continue
                        if i >= offset + limit:
                            break
                        selected_examples.append((key, ex_group))
                else:
                    if sorted_by.find("/") == -1:
                        sorted_by_first, sorted_by_remain = sorted_by, None
                        assert sorted_by_first in ["id", "name"], sorted_by_first
                    else:
                        sorted_by_first, sorted_by_remain = sorted_by.split("/", 1)
                        assert sorted_by_first == "data", sorted_by_first

                    # must sort
                    if limit <= 0:
                        limit = math.inf  # type: ignore
                    selected_examples = []
                    sorted_keys = {}
                    if sorted_by_remain is None:
                        for key, ex_group in f["individual"].items():
                            selected_examples.append((key, ex_group))
                            sorted_keys[key] = ex_group.attrs[sorted_by_first]
                    else:
                        for key, ex_group in f["individual"].items():
                            selected_examples.append((key, ex_group))
                            if sorted_by_remain not in ex_group:
                                raise KeyError(
                                    f"sort by key `data.{sorted_by_remain}` not found"
                                )
                            sorted_keys[key] = ex_group[sorted_by_remain][()]

                    selected_examples.sort(
                        key=lambda x: sorted_keys[x[0]],
                        reverse=sorted_order == "descending",
                    )
                    selected_examples = selected_examples[offset : offset + limit]

                for example_id, ex_group in selected_examples:
                    if example_id not in expdata.individual:
                        example = ExampleData(
                            id=ex_group.attrs["id"],
                            name=ex_group.attrs["name"],
                        )

                        if "primitive" in fields["individual"]:
                            example.data.primitive = self._load_nested_primitive_object(
                                ex_group["primitive"]
                            )
                        if "complex" in fields["individual"]:
                            for key, value in ex_group["complex"].items():
                                pyobject_class = PyObject.from_classpath(
                                    ex_group["complex"].attrs[key]
                                )
                                example.data.complex[key] = pyobject_class.from_hdf5(
                                    value[()]
                                )
                        expdata.individual[example_id] = example
                    else:
                        if "primitive" in fields["individual"]:
                            expdata.individual[
                                example_id
                            ].data.primitive = self._load_nested_primitive_object(
                                ex_group["primitive"]
                            )

                        if "complex" in fields["individual"]:
                            for key, value in ex_group["complex"].items():
                                pyobject_class = PyObject.from_classpath(
                                    ex_group.attrs[key]
                                )
                                expdata.individual[example_id].data.complex[
                                    key
                                ] = pyobject_class.from_hdf5(value[()])

            n_examples = len(f["individual"])
        return expdata, n_examples

    def _update_nested_primitive_object(
        self, group: Group, primitive_object: NestedPrimitiveOutput
    ):
        for key, value in primitive_object.items():
            self._validate_key(key)
            if isinstance(value, dict):
                subgroup = group.create_group(key, track_order=True)
                self._update_nested_primitive_object(subgroup, value)
            elif value is None:
                group[key] = Empty("f")
            else:
                group[key] = value

    def _load_nested_primitive_object(self, group: Group) -> NestedPrimitiveOutput:
        primitive_object = {}
        for key, value in group.items():
            if isinstance(value, Group):
                primitive_object[key] = self._load_nested_primitive_object(value)
            else:
                val = value[()]
                if isinstance(val, np.floating):
                    val = float(val)
                elif isinstance(val, np.integer):
                    val = int(val)
                elif isinstance(val, np.bool_):
                    val = bool(val)
                elif isinstance(val, bytes):
                    val = val.decode()
                elif isinstance(val, Empty):
                    val = None
                primitive_object[key] = val
        return primitive_object

    def _validate_key(self, key: str):
        if key.find("/") != -1:
            raise KeyError(f"Cannot have '/' in hdf5 group's item: {key}")
