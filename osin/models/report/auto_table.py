from __future__ import annotations
from dataclasses import MISSING, dataclass
from typing import Optional, Union, List
from osin.models.report.base_report import ReportData, ReportDataPoint

from osin.models.report.index_schema import (
    Attr,
    AttrGetter,
    AttrValue,
    Record,
    UnsupportedAttributeError,
)
from osin.types.pyobject_type import NoneType


@dataclass
class RecordFilter:
    is_in: list[AttrGetter]

    @staticmethod
    def from_tuple(obj):
        return RecordFilter(
            [AttrGetter.from_tuple(o) for o in obj[0]],
        )

    def to_tuple(self):
        return ([o.to_tuple() for o in self.is_in],)

    def filter(self, records: list[Record]):
        if len(self.is_in) == 0:
            return records
        matched_records = []
        for record in records:
            if all(
                attr.get_attribute_value(record) is not MISSING for attr in self.is_in
            ):
                matched_records.append(record)
        return matched_records


@dataclass
class AutoTableReport:
    """An auto table report where the row headers will show the z-values (metrics)
    and the column headers will show the run's parameters
    """

    # list of groups, each is a tuple of group name and a filter
    groups: list[tuple[str, RecordFilter]]
    # list of z-value to display in the headers.
    z_values: list[AttrGetter]
    ignore_list_attr: bool = False

    @staticmethod
    def from_tuple(obj):
        return AutoTableReport(
            [(name, RecordFilter.from_tuple(filter)) for name, filter in obj[0]],
            [AttrGetter.from_tuple(o) for o in obj[1]],
            obj[2],
        )

    def to_tuple(self):
        return (
            [(name, filter.to_tuple()) for name, filter in self.groups],
            [o.to_tuple() for o in self.z_values],
            self.ignore_list_attr,
        )

    def get_data(self, records: list[Record]) -> AutoTableReportData:
        """Get the report data"""
        groups = []
        # group the records by the group name, and filter the records
        for group, filter in self.groups:
            matched_records = filter.filter(records)
            diff_attrs: list[AttrGetter] = self.find_diff_attrs(matched_records)
            rows = []
            for record in matched_records:
                row = AutoTableReportRowData(record.id, [], [])
                for attr in diff_attrs:
                    value = attr.get_value(record)
                    assert value is not MISSING
                    row.headers.append(value)
                for attr in self.z_values:
                    value = attr.get_value(record)
                    assert value is not MISSING
                    row.values.append(value)
                rows.append(row)
            groups.append(
                (
                    group,
                    AutoTableReportGroupData(
                        attr_headers=[attr.path for attr in diff_attrs], rows=rows
                    ),
                )
            )

        return AutoTableReportData(
            groups, value_headers=[attr.path for attr in self.z_values]
        )

    def find_diff_attrs(self, records: list[Record]) -> list[AttrGetter]:
        """Find the attributes that have different values in the records"""
        attrs = {}
        for record in records:
            self.get_attrs(record.id, record.params, attrs, ())

        diffs = []
        for attr, values in attrs.items():
            if len(values) > 1:
                diffs.append(AttrGetter(("params",) + attr))

        return diffs

    def get_attrs(
        self,
        record_id: int,
        params: dict,
        output: dict[Attr, set],
        path: Attr,
    ):
        """Get the attributes from the record's params"""
        for key, value in params.items():
            new_path = path + (key,)
            if isinstance(value, (str, int, bool, float, NoneType)):
                if new_path not in output:
                    output[new_path] = set()
                output[new_path].add(value)
            elif isinstance(value, dict):
                self.get_attrs(record_id, value, output, new_path)
            elif isinstance(value, list):
                if not self.ignore_list_attr:
                    raise UnsupportedAttributeError(
                        f"Cannot handle parameter which is a list. Found one located at record {record_id} with path {new_path}"
                    )
            else:
                raise NotImplementedError(f"Unknown type: {type(value)}")


@dataclass
class AutoTableReportData:
    groups: list[tuple[str, AutoTableReportGroupData]]
    value_headers: list[Attr]

    def to_dict(self):
        return {
            "groups": [(group, data.to_dict()) for group, data in self.groups],
            "value_headers": self.value_headers,
        }


@dataclass
class AutoTableReportGroupData:
    attr_headers: list[Attr]
    rows: list[AutoTableReportRowData]

    def to_dict(self):
        return {
            "attr_headers": self.attr_headers,
            "rows": [record.to_dict() for record in self.rows],
        }


@dataclass
class AutoTableReportRowData:
    record_id: int
    headers: list[AttrValue | float]
    values: list[AttrValue | float]

    def to_dict(self):
        return {
            "record_id": self.record_id,
            "headers": self.headers,
            "values": self.values,
        }
