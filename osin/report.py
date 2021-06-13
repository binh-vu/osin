from dataclasses import dataclass
from enum import Enum
from typing import Dict, List

from osin.executor import BashExecutor


class ExecutorType(Enum):
    Bash = "bash"


@dataclass
class ReportDataQuery:
    executor_type: ExecutorType
    executor_params: Dict[str, str]
    # arguments: Dict[str, Optional[str]]


@dataclass
class Report:
    # parameters of the report and their possible values
    parameters: Dict[str, List[str]]
    # query to obtain data of the report
    data_query: ReportDataQuery

    def query(self, parameters: Dict[str, List[str]]):
        # TODO: retrieve executor based on type
        assert self.data_query.executor_type == ExecutorType.Bash
        executor = BashExecutor(**self.data_query.executor_params)


