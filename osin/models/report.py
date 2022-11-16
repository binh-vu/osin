from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from itertools import chain, product
from typing import Any, Literal, Optional, Union
from gena.custom_fields import DataClassField
from peewee import (
    CharField,
    ForeignKeyField,
    TextField,
)
from osin.models.base import BaseModel
from osin.models.exp import Exp, ExpRun
from sm.misc.funcs import assert_not_null

EXPNAME_INDEX_FIELD = "__exp__"
EXPNAME_INDEX_FIELD_TYPE = Literal["__exp__"]


@dataclass
class Index:
    index: tuple[str, ...]
    # list of values to show in the report, None to show all
    values: Optional[list[Union[str, int, bool, None]]] = None
    property: Literal["params", "aggregated_primitive_outputs"] = "params"

    @staticmethod
    def from_tuple(obj: tuple):
        return Index(tuple(obj[0]), obj[1], obj[2])

    def is_expname_index(self):
        return len(self.index) == 1 and self.index[0] == EXPNAME_INDEX_FIELD

    def get_value(self, run: ExpRun) -> Union[str, int, bool, None]:
        if self.is_expname_index():
            return run.exp.name

        prop = getattr(run, self.property)
        for i in range(len(self.index) - 1):
            prop = prop[self.index[i]]
        return prop[self.index[-1]]


@dataclass
class ExpIndex:
    # list of indexes, the index which value is found in the run is used.
    # we allow mixed index and expname to make it's more flexible
    indices: dict[int, Union[Index, EXPNAME_INDEX_FIELD_TYPE]]
    values: Optional[dict[int, list[Union[str, int, bool, None]]]] = None

    def get_value(self, run: ExpRun) -> Union[str, int, bool, None]:
        idx = self.indices[run.exp_id]
        if isinstance(idx, Index):
            return idx.get_value(run)
        return idx

    @staticmethod
    def from_tuple(obj: tuple):
        return ExpIndex(
            {int(expid): Index.from_tuple(index) for expid, index in obj[0].items()},
            None
            if obj[1] is None
            else {int(expid): expvalue for expid, expvalue in obj[1].items()},
        )


@dataclass
class Axis:
    indices: list[Union[Index, ExpIndex]]

    def get_value(self, run: ExpRun) -> tuple:
        return tuple(idx.get_value(run) for idx in self.indices)

    def populate_values(self, runs: list[ExpRun]):
        """Populate the values of the axis"""
        for idx in self.indices:
            if idx.values is None:
                if isinstance(idx, Index):
                    idx.values = list({idx.get_value(run) for run in runs})
                else:
                    idx.values = {expid: [] for expid in idx.indices}
                    for run in runs:
                        expidx = idx.indices[run.exp_id]
                        idx.values[run.exp_id].append(
                            expidx.get_value(run)
                            if isinstance(expidx, Index)
                            else vffff
                        )
                    for expid in idx.values:
                        idx.values[expid] = list(set(idx.values[expid]))
        return self

    def get_values(
        self,
    ) -> tuple[
        list[tuple],
        list[Union[tuple[str, ...], tuple[int, list[Union[int, str, bool, None]]]]],
    ]:
        """Get the items of the axis by generating combinations of values of each index.

        Generating the combinations is not longer a simple cross product because of ExpIndex.

        For example, take a look at the following axis:

        - __exp__
        - dataset
        - { crexp: params.cr_method, cgexp: params.cg_method, baseline: params.known_subj }

        Assuming dataset has 3 unique values, then (__exp__, dataset) has 9 combinations (there are 3 exps). (__exp__, dataset, { crexp... })
        will has: 3 * (|params.cr_method| + |params.cg_method| + ...) combinations. Anytime ExpIndex appears, __exp__ won't be included in the
        list of items.
        """
        output = {}
        exp_indices = [
            (i, idx) for i, idx in enumerate(self.indices) if isinstance(idx, ExpIndex)
        ]
        non_exp_indices = [
            (i, idx)
            for i, idx in enumerate(self.indices)
            if not isinstance(idx, ExpIndex)
        ]

        if len(exp_indices) == 0:
            return list(
                product(*[assert_not_null(idx.values) for i, idx in non_exp_indices])
            ), [idx.index for i, idx in non_exp_indices]

        expid2values = {expid: [] for expid in exp_indices[0][1].indices.keys()}
        for i, idx in exp_indices:
            assert idx.values is not None
            for expid, expvalues in idx.values.items():
                expid2values[expid].append((i, expvalues))

        output_schema: list[Any] = [None] * len(self.indices)
        for i, idx in non_exp_indices:
            output_schema[i] = idx.index
        for i, idx in exp_indices:
            assert idx.values is not None
            output_schema[i] = list(idx.values.items())

        output = []
        for expid, expvalues in expid2values.items():
            iters: list[Any] = [None] * len(self.indices)
            for i, idx in non_exp_indices:
                assert idx.values is not None
                iters[i] = idx.values
            for i, v in expvalues:
                iters[i] = v
            output.extend(product(*iters))
        return output, output_schema

    @staticmethod
    def from_tuple(obj: tuple):
        return Axis(
            [
                ExpIndex.from_tuple(x) if len(x) == 1 else Index.from_tuple(x)
                for x in obj[0]
            ]
        )


@dataclass
class TableReportArgs:
    xaxis: Axis
    yaxis: Axis
    # although it has the same schema as axes, axes are multi-level indices
    # and going down each level implies an AND condition has been applied.
    # for values, it is must a collection of values to display
    zvalues: list[Union[Index, ExpIndex]]

    @staticmethod
    def from_tuple(obj: tuple):
        return TableReportArgs(
            Axis.from_tuple(obj[0]),
            Axis.from_tuple(obj[1]),
            [
                ExpIndex.from_tuple(x) if len(x) == 1 else Index.from_tuple(x)
                for x in obj[2]
            ],
        )


class ReportType(str, Enum):
    Table = "table"


@dataclass
class ReportArgs:
    type: ReportType
    value: TableReportArgs

    @staticmethod
    def from_tuple(obj: tuple):
        return ReportArgs(ReportType(obj[0]), TableReportArgs.from_tuple(obj[1]))

    def get_experiment_ids(self) -> set[int]:
        if self.type == ReportType.Table:
            return {
                expid
                for index in chain(
                    self.value.xaxis.indices,
                    self.value.yaxis.indices,
                    self.value.zvalues,
                )
                if isinstance(index, ExpIndex)
                for expid in index.indices.keys()
            }
        raise NotImplementedError(self.type)


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
