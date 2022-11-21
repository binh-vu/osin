from __future__ import annotations
from dataclasses import dataclass
from osin.models.report.index_schema import (
    AttrGetter,
    AttrValue,
    Attr,
    Index,
    IndexElement,
    IndexSchema,
    Record,
)


@dataclass
class BaseReport:
    x_axis: IndexSchema
    y_axis: IndexSchema
    z_values: list[AttrGetter]

    def get_data(self, records: list[Record]):
        """Get the report data"""
        xindex = self.x_axis.build_index(records)
        yindex = self.y_axis.build_index(records)

        data = {}
        for record in records:
            xelem = self.x_axis.get_index_element(record)
            yelem = self.y_axis.get_index_element(record)

            if xelem is None or yelem is None:
                continue

            if xelem not in data:
                data[xelem] = {}
            if yelem not in data[xelem]:
                data[xelem][yelem] = {}

            data_items = data[xelem][yelem]
            for zvalue in self.z_values:
                if zvalue.path not in data_items:
                    data_items[zvalue.path] = []
                data_items[zvalue.path].append(
                    {
                        "value": zvalue.get_value(record),
                        "record_id": record.id,
                    }
                )

        datapoints = []
        for xitem, yitems_ in data.items():
            for yitem, zitems in yitems_.items():
                for zitem, values in zitems.items():
                    for value in values:
                        datapoints.append(
                            ReportDataPoint(
                                x=xitem,
                                y=yitem,
                                z=zitem,
                                record_id=value["record_id"],
                                record_value=value["value"],
                            )
                        )
        return ReportData(datapoints, xindex=xindex, yindex=yindex)

    @staticmethod
    def from_tuple(obj):
        return BaseReport(
            IndexSchema.from_tuple(obj[0]),
            IndexSchema.from_tuple(obj[1]),
            [AttrGetter.from_tuple(o) for o in obj[2]],
        )

    def to_tuple(self):
        return (
            self.x_axis.to_tuple(),
            self.y_axis.to_tuple(),
            [zval.to_tuple() for zval in self.z_values],
        )


@dataclass
class ReportData:
    data: list[ReportDataPoint]
    xindex: Index
    yindex: Index


@dataclass
class ReportDataPoint:
    x: IndexElement
    y: IndexElement
    z: Attr
    record_id: int
    record_value: AttrValue
