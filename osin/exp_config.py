import argparse
import copy
import itertools
import os
import socket
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Union
from uuid import uuid4

from ruamel.yaml import YAML

from osin.config import ROOT_DIR
from osin.db import Job, ExpResult


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

    def report(self, names: List[str]=None):
        if names is None:
            names = [report['name'] for report in self.reports]

        # get the data first
        df = ExpResult.as_dataframe(self.table_name)

        report_results = []
        for name in names:
            report = [report for report in self.reports if report['name'] == name][0]
            if report['type'] == 'matrix':
                groups = list(self.parameters.keys())
                report_results.append({
                    "name": name,
                    "value": df.groupby(groups)[report['columns']].aggregate(['mean', 'min', 'max', 'std'])
                })
        return report_results


if __name__ == '__main__':
    reports = ExpConfig.from_file(os.path.join(ROOT_DIR, "experiments.yml"))
    # reports[0].trigger_runs({k: v for k, v in reports[0].parameters.items()})
    reports[0].report()
    # print(list(Job.select().where(Job.hostname == 'sequoia', Job.pid == '12950')))
