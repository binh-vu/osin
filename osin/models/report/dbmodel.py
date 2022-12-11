from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Union

from gena.custom_fields import DataClassField
from osin.models.base import BaseModel
from osin.models.exp import Exp
from osin.models.report.base_report import BaseReport
from peewee import CharField, ForeignKeyField, TextField
from osin.models.report.auto_table import AutoTableReport


class ReportType(str, Enum):
    Table = "table"
    AutoTable = "auto_table"


@dataclass
class ReportArgs:
    type: ReportType
    value: Union[BaseReport, AutoTableReport]

    @staticmethod
    def from_tuple(obj: tuple):
        reporttype = ReportType(obj[0])
        if reporttype == ReportType.Table:
            value = BaseReport.from_tuple(obj[1])
        elif reporttype == ReportType.AutoTable:
            value = AutoTableReport.from_tuple(obj[1])
        else:
            raise ValueError(f"Unknown report type: {reporttype}")
        return ReportArgs(reporttype, value)

    def to_tuple(self):
        return (self.type.value, self.value.to_tuple())


@dataclass
class ReportDisplayPosition:
    # higher is closer to the top
    row_order: int
    # sum of col span & offset must be <= 24
    col_span: int
    col_offset: int


class Report(BaseModel):
    id: int
    name = CharField()
    description = TextField()
    args: ReportArgs = DataClassField(ReportArgs, null=True)  # type: ignore


class ExpReport(BaseModel):
    class Meta:
        indexes = ((("exp", "report"), True),)

    exp = ForeignKeyField(Exp, backref="reports", on_delete="CASCADE")
    exp_id: int
    report = ForeignKeyField(Report, backref="exps", on_delete="CASCADE")
    report_id: int

    position: ReportDisplayPosition = DataClassField(ReportDisplayPosition, null=True)  # type: ignore
