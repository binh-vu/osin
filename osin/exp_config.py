import argparse
import copy
import functools
import itertools
import os
import pandas as pd
import socket
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Union, Optional
from uuid import uuid4
import matplotlib.pyplot as plt
import seaborn as sns
from ruamel.yaml import YAML
import plotly.graph_objects as go
from osin.config import ROOT_DIR
from osin.db import Job, ExpResult


# noinspection PyMethodMayBeStatic
@dataclass
class ExpConfig:
    """Description of an experiment. It includes parameters and their possible values.
    """
    # name of the report
    name: str
    # name of the table to store the run
    table_name: str
    # description of the run
    description: str
    # parameters of the report and their possible values
    parameters: Dict[str, List[str]]
    # the list of reports we should made from the experiments
    reports: List[dict]
    # command to trigger the run to gather data for the report
    run_trigger_type: str
    run_trigger_args: List[str]

    @staticmethod
    def from_file(infile: Union[str, Path]) -> List['ExpConfig']:
        with open(str(infile), "r") as f:
            yaml = YAML()
            data = yaml.load(f)

        reports = []
        for report in data:
            # allow args to be either string or list
            if isinstance(report['run_trigger']['args'], list):
                args = report['run_trigger']['args']
            else:
                args = report['run_trigger']['args'].split(" ")

            report = ExpConfig(
                name=report['name'],
                table_name=report.get('table', 'default'),
                description=report.get('description', ''),
                parameters=report['parameters'],
                reports=report['reports'],
                run_trigger_type=report['run_trigger']['type'],
                run_trigger_args=args
            )
            reports.append(report)
        return reports

    def trigger_runs(self, parameters: Dict[str, List[str]]):
        args = self.run_trigger_args
        runs = []

        # find place to put the parameters in the run trigger arguments
        param_placements = {}
        for i, arg in enumerate(args):
            if arg.startswith("%%") and arg.endswith("%%") and arg[2:-2] in parameters:
                param_placements[arg[2:-2]] = i

        for values in itertools.product(*parameters.values()):
            run_args = copy.copy(args)
            for k, v in zip(parameters.keys(), values):
                run_args[param_placements[k]] = v
            runs.append(run_args)

        jobs = []
        if self.run_trigger_type == "bash":
            for run_args in runs:
                split_idx = run_args.index("--")
                init_args, rargs = run_args[:split_idx], run_args[split_idx + 1:]
                jobs.append(Job.create(
                    exec_type=self.run_trigger_type,
                    exec_init_args=init_args,
                    exec_run_args=rargs,
                    status="queueing"
                ))
        else:
            raise NotImplementedError()
        return jobs

    def report(self, names: List[str] = None):
        if names is None:
            names = [report['name'] for report in self.reports]

        assert len(names) == len(set(names)), "Duplicated report names"
        # get the data first
        df = ExpResult.as_dataframe(self.table_name)

        def get_value_func(name: str):
            report = [report for report in self.reports if report['name'] == name][0]
            fname = f'report_{report["type"]}'
            if not hasattr(self, fname):
                raise NotImplementedError(f"Not support {report['type']}")
            func = getattr(self, fname)

            @functools.wraps(func)
            def func_wrapper():
                # handle no data
                if len(df) == 0:
                    return f"No data for report {report['type']}"

                try:
                    return func(df, **report.get('params', {}))
                except Exception as e:
                    # return an exception for streamlit to display
                    return e
            return func_wrapper

        report_grids = [[]]
        for name in names:
            report = [report for report in self.reports if report['name'] == name][0]
            colspan = report.get('colspan', 24)
            row_used_size = sum([r['colspan'] for r in report_grids[-1]])
            if colspan == 24 or row_used_size + colspan > 24:
                # use new row
                report_grids.append([])
            report_grids[-1].append({
                "name": name,
                "colspan": colspan,
                "display_name": report.get('display_name', True),
                "get_value": get_value_func(name)
            })

        if len(report_grids[0]) == 0:
            report_grids.pop(0)

        return report_grids

    def report_matrix(self, df: pd.DataFrame, columns: List[str], agg_metrics: List[str] = None,
                      groupby: List[str] = None):
        agg_metrics = agg_metrics or ['mean', 'min', 'max', 'std']
        if groupby is not None:
            df = df.groupby(groupby)
        return df[columns].aggregate(agg_metrics)

    def report_barplot(self, df: pd.DataFrame, x: str, y: str, group: str = None, title: str = None):
        if group is not None:
            group_values = df[group].unique()
            sdfs = [(group_value, df[df[group] == group_value]) for group_value in group_values]
        else:
            sdfs = [(None, df)]

        data = []
        for group_value, sdf in sdfs:
            sdf = sdf.groupby(x).aggregate(['mean', 'min', 'max'])
            args = dict(x=sdf.index,
                        y=sdf[y, 'mean'],
                        text=[f"{v:.3f}" for v in sdf[y, 'mean']],
                        textposition='auto',
                        error_y=dict(
                            type='data',
                            symmetric=False,
                            array=sdf[y, 'max'] - sdf[y, 'mean'],
                            arrayminus=sdf[y, 'mean'] - sdf[y, 'min'],
                            visible=True
                        ))
            if group is not None:
                args["name"] = group
            data.append(args)

        fig = go.Figure(data=[
            go.Bar(**kwargs)
            for kwargs in data
        ])

        if title is not None:
            fig.update_layout(title_text=title)
        return fig


# if __name__ == '__main__':
#     reports = ExpConfig.from_file(os.path.join(ROOT_DIR, "experiments.yml"))
#     # reports[0].trigger_runs({k: v for k, v in reports[0].parameters.items()})
#     reports[0].report()
#     # print(list(Job.select().where(Job.hostname == 'sequoia', Job.pid == '12950')))
