import copy
import itertools
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List

from osin.executor import BashExecutor


class ExecutorType(Enum):
    Bash = "bash"


@dataclass
class ReportDataQuery:
    executor_type: ExecutorType
    arguments: List[str]


@dataclass
class Report:
    """Blueprint to trigger a run. It includes parameters and their possible values.

    A report can be created by trigger a data query. The data query must take parameters
    specified in this class.
    """
    name: str
    description: str
    # parameters of the report and their possible values
    parameters: Dict[str, List[str]]
    # query to obtain data of the report
    data_query: ReportDataQuery

    def query(self, parameters: Dict[str, List[str]], executor_id: str):
        # TODO: retrieve executor from an executor pool
        assert self.data_query.executor_type == ExecutorType.Bash
        executor = BashExecutor(**self.data_query.executor_params)
        args = self.data_query.arguments
        runs = []
        arg_replacement = {}
        for i, arg in args:
            if arg.startswith("%%") and arg.endswith("%%") and arg[2:-2] in parameters:
                arg_replacement[arg[2:-2]] = i
        for values in itertools.product(*parameters.values()):
            run_args = copy.copy(args)
            for k, v in zip(parameters.keys(), values):
                run_args[arg_replacement[k]] = v
            runs.append(run_args)

        # submit them to the executor to queue them.
        for run_args in runs:
            executor.exec(run_args)

