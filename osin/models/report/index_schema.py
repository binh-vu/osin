from __future__ import annotations
from copy import deepcopy
from dataclasses import dataclass, MISSING, _MISSING_TYPE
from functools import cached_property
from typing import Any, Literal, Optional, Union
from osin.models.exp import ExpRun
from osin.types.pyobject_type import NoneType


EXP_INDEX_FIELD = "__exp__"
EXPNAME_INDEX_FIELD_TYPE = Literal["__exp__"]

# Representing a record of a data source
Record = ExpRun

# For a single-level index, AttrValue is an element of the index
# For a multi-level index, AttrValue is an item of an n-tuple, which is an element of the index.
# We limit AttrValue to be Python primitive types, so that there is always an injection for the attribute
AttrValue = Union[str, int, bool, None]
# path to an attribute in a record
Attr = tuple[str, ...]
IndexElement = tuple[AttrValue, ...]


@dataclass
class AttrGetter:
    # path to the attribute in the tree
    path: Attr
    values: Optional[dict[AttrValue, int]] = None

    def get_attribute_value(self, record: Record) -> AttrValue | _MISSING_TYPE:
        """Get attribute value. If the filtered values are specified, if the value is not in the filtered values, return MISSING"""
        value = self._get_value(record)
        if value is MISSING:
            return value
        if isinstance(value, list) and all(
            isinstance(x, (str, int, bool, NoneType)) for x in value
        ):
            # support parameters that are a list of enumerated options
            value = ",".join(str(x) for x in sorted(value))
            return value
        if isinstance(value, (str, int, bool, NoneType)):
            return value
        raise ValueError(f"Invalid value: {value}")

    def get_value(self, record: Record) -> AttrValue | float | _MISSING_TYPE:
        """Get the attribute value, but this attribute value is not used in the index so it can be a float"""
        value = self._get_value(record)
        if value is not MISSING:
            if not isinstance(value, (str, int, float, bool, NoneType)):
                raise ValueError(f"Invalid value: {value}")
        return value

    def _get_value(self, record: Record) -> Any | _MISSING_TYPE:
        if self.path[0] == EXP_INDEX_FIELD:
            if self.values is not None and record.exp_id not in self.values:
                return MISSING
            return record.exp.name

        if self.path[0] == "params":
            props: dict = record.params
        elif self.path[0] == "aggregated_primitive_outputs":
            props: dict = record.aggregated_primitive_outputs
        else:
            raise KeyError(f"Invalid path: {self.path}")

        for i in range(1, len(self.path) - 1):
            if self.path[i] not in props:
                return MISSING
            tmp = props[self.path[i]]
            if not isinstance(tmp, dict):
                return MISSING
            props = tmp

        value = props.get(self.path[-1], MISSING)
        try:
            if self.values is not None and value not in self.values:
                return MISSING
        except TypeError:
            # value is not hashable
            raise ValueError(f"Invalid value: {value}")
        return value

    def to_tuple(self):
        return self.path, list(self.values.keys()) if self.values is not None else None

    @classmethod
    def from_tuple(cls, obj):
        return cls(
            tuple(obj[0]),
            {v: i for i, v in enumerate(obj[1])} if obj[1] is not None else None,
        )


@dataclass
class Index:
    attr: Attr
    # mapping from values at this level to the values at the lower level
    # the element of the index can be constructed from traveling down the tree
    # combining each value at each level
    # NOTE: we accept that the lower level can be a combination of values obtained
    # from different attribute getters. Therefore, we use list[Index] instead of Optional[Index]
    # when the list is empty, it means you have reached the leaf of the index
    children: dict[AttrValue, list[Index]]

    def merge(self, other: Index) -> None:
        """Merge two indexes"""
        assert self.attr == other.attr
        for value, other_next_values in other.children.items():
            if value in self.children:
                our_next_values = self.children[value]
                if len(our_next_values) > 0:
                    # other element and our element must have the same type
                    # because it should not be okay to have two paths that one path is a subpath of the other
                    # in that case, the subpath should be removed
                    assert len(other_next_values) > 0
                    # merge two lists
                    path2other_next_values = {x.attr: x for x in other_next_values}
                    for our_next_value in our_next_values:
                        if our_next_value.attr in path2other_next_values:
                            our_next_value.merge(
                                path2other_next_values[our_next_value.attr]
                            )
                            del path2other_next_values[our_next_value.attr]
                    for other_next_value in path2other_next_values.values():
                        our_next_values.append(other_next_value)
                else:
                    assert len(other_next_values) == 0
                    # do nothing
            else:
                self.children[value] = other_next_values

    def trim_unobserved_combinations(
        self, attrs: list[AttrGetter], fully_observed_combinations: list[IndexElement]
    ) -> bool:
        if len(attrs) == 0:
            return True

        if attrs[0].path != self.attr:
            # need to go deeper
            if all(element is None for element in self.children.values()):
                return False

            success = False
            for next_values in self.children.values():
                for element in next_values:
                    success = success or element.trim_unobserved_combinations(
                        attrs, fully_observed_combinations
                    )
            return success

        # we are at the right level
        value2subobservations = {}
        for combination in fully_observed_combinations:
            value = combination[0]
            if value not in value2subobservations:
                value2subobservations[value] = []
            value2subobservations[value].append(combination[1:])

            if value not in self.children:
                raise ValueError("Observe an attribute value that is not in the index")

        attr_keys: Optional[set[Attr]] = None

        for value, next_values in list(self.children.items()):
            if value not in value2subobservations:
                # this value is not observed, so we remove it from the index, but only the part of the index that contains attrs[1:]
                if attr_keys is None:
                    attr_keys = {attr.path for attr in attrs[1:]}
                next_values = [x for x in next_values if x.attr not in attr_keys]
                if len(next_values) == 0:
                    del self.children[value]
                else:
                    for next_level_value in next_values:
                        next_level_value.remove_attrs(attr_keys)
                    self.children[value] = next_values
            else:
                if len(next_values) == 0:
                    # we reach the lowest level, so the subobservations should be empty
                    if any(len(x) != 0 for x in value2subobservations[value]):
                        return False
                else:
                    success = False
                    for element in next_values:
                        success = success or element.trim_unobserved_combinations(
                            attrs[1:], value2subobservations[value]
                        )
                    if not success:
                        return False
        return True

    def remove_attrs(self, attrs: set[Attr]):
        for value, next_values in list(self.children.items()):
            if len(next_values) == 0:
                continue
            next_values = [x for x in next_values if x.attr not in attrs]
            if len(next_values) == 0:
                del self.children[value]
            else:
                for next_level_value in next_values:
                    next_level_value.remove_attrs(attrs)
                self.children[value] = next_values


@dataclass
class IndexSchema:
    attrs: list[AttrGetter]
    # mapping from attrgetter's index to the index of attrgetter's children
    index2children: list[list[int]]
    # list of attributes that are fully observed in the data source
    fully_observed_attrs: list[list[int]]

    def build_index(self, records: list[Record]) -> list[Index]:
        """Build an index from the list of records"""
        this = self._infer_attributes(records)
        paths = this.leaf_paths
        indices = [this._build_index_from_path(paths[0])]
        for path in paths[1:]:
            newindex = this._build_index_from_path(path)
            for index in indices:
                if index.attr == newindex.attr:
                    index.merge(newindex)
                    break
            else:
                indices.append(newindex)

        fully_observed_combinations = this._get_fully_observed_combinations(records)
        for attrs, combinations in fully_observed_combinations:
            trim_results = [
                index.trim_unobserved_combinations(attrs, combinations)
                for index in indices
            ]
            if not any(trim_results):
                raise ValueError(
                    "The order in the observed combinations is not consistent with the index"
                )

        return indices

    def get_index_element(self, record: Record) -> Optional[IndexElement]:
        """Get the index's element of a record"""
        paths = self.leaf_paths
        index_element = {}
        elements = []
        for path in paths:
            element = []
            for attrgetter in path:
                if attrgetter.values is None:
                    if attrgetter.path not in index_element:
                        index_element[attrgetter.path] = attrgetter.get_attribute_value(
                            record
                        )
                    if index_element[attrgetter.path] is MISSING:
                        element = None
                        break
                    element.append(index_element[attrgetter.path])
                else:
                    if (value := attrgetter.get_attribute_value(record)) is not MISSING:
                        element.append(value)
                    else:
                        element = None
                        break
            else:
                elements.append(tuple(element))

        if len(elements) == 0:
            return None
        elif len(elements) > 1:
            raise InvalidIndexError(
                f"This multi-level index is ambiguous. Found two index elements: {', '.join([str(element) for element in elements])} in the record {record.id}"
            )
        return tuple(elements[0])

    @staticmethod
    def from_tuple(obj):
        return IndexSchema(
            [AttrGetter.from_tuple(x) for x in obj[0]],
            obj[1],
            obj[2],
        )

    def to_tuple(self):
        return (
            [attrgetter.to_tuple() for attrgetter in self.attrs],
            self.index2children,
            self.fully_observed_attrs,
        )

    @cached_property
    def leaf_paths(self) -> list[list[AttrGetter]]:
        roots = [i for i, parents in enumerate(self.index2parents) if len(parents) == 0]
        paths = []
        for root in roots:
            paths.extend(self._leaf_paths_recur(root))

        return paths

    @cached_property
    def index2parents(self):
        index2parents_: list[list[int]] = [[] for i in range(len(self.attrs))]
        for i, children in enumerate(self.index2children):
            for ci in children:
                index2parents_[ci].append(i)
        return index2parents_

    def _infer_attributes(self, records: list[Record]) -> IndexSchema:
        """Infer attributes from the list of records"""
        this = deepcopy(self)
        for attrgetter in this.attrs:
            if attrgetter.values is None:
                values = {}
                for record in records:
                    value = attrgetter.get_attribute_value(record)
                    if value is not MISSING and value not in values:
                        values[value] = len(values)
                attrgetter.values = values

        return this

    def _get_fully_observed_combinations(
        self, records: list[Record]
    ) -> list[tuple[list[AttrGetter], list[IndexElement]]]:
        observed_combinations = []
        for observed_attr_idxs in self.fully_observed_attrs:
            observed_attrs = [self.attrs[i] for i in observed_attr_idxs]
            combinations = set()
            for record in records:
                elem = tuple(
                    attr.get_attribute_value(record) for attr in observed_attrs
                )
                if all(v is not MISSING for v in elem):
                    combinations.add(elem)
            observed_combinations.append((observed_attrs, combinations))
        return observed_combinations

    def _build_index_from_path(self, path: list[AttrGetter]) -> Index:
        if len(path) == 0:
            raise Exception("Path should not be empty. This is a bug.")

        attrgetter = path[0]
        assert attrgetter.values is not None

        if len(path) == 1:
            return Index(path[0].path, {value: [] for value in attrgetter.values})

        remaining_path = path[1:]
        return Index(
            path[0].path,
            {
                value: [self._build_index_from_path(remaining_path)]
                for value in attrgetter.values
            },
        )

    def _leaf_paths_recur(self, attrgetter_index: int) -> list[list[AttrGetter]]:
        attrgetter = self.attrs[attrgetter_index]
        if len(self.index2children[attrgetter_index]) == 0:
            return [[attrgetter]]

        paths = []
        for i in self.index2children[attrgetter_index]:
            for path in self._leaf_paths_recur(i):
                paths.append([attrgetter] + path)
        return paths


class InvalidIndexError(Exception):
    """Raised when the index is invalid."""

    pass
