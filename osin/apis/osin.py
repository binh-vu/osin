from pathlib import Path
from typing import Dict, List, Optional, Union
from abc import ABC, abstractmethod

import numpy as np
from osin.models.parameters import Parameters, PyObject
from osin.apis.remote_exp import RemoteExp, RemoteExpRun


class Osin(ABC):
    """This class provides two methods to communicate with Osin, either locally or remotely via http protocol"""

    @staticmethod
    def local(osin_dir: Union[Path, str]):
        from osin.apis.local_osin import LocalOsin

        return LocalOsin(osin_dir)

    @abstractmethod
    def init_exp(
        self,
        name: str,
        version: int,
        description: Optional[str] = None,
        params: Optional[Union[Parameters, List[Parameters]]] = None,
    ) -> RemoteExp:
        """Init an experiment in Osin.

        If the experiment already exists, the input version must be the latest one, and the parameters must match.
        If the experiment does not exist, it will be created with the given parameters.
        """
        pass

    @abstractmethod
    def new_exp_run(self, exp: RemoteExp) -> RemoteExpRun:
        """Create a new run for an experiment."""
        pass

    @abstractmethod
    def finish_exp_run(self, exp_run: RemoteExpRun):
        """Flush whatever remaining in experiment run that haven't sent to the database to the database before stopping the experiment run."""
        pass

    @abstractmethod
    def update_exp_run_params(
        self, exp_run: RemoteExpRun, params: Union[Parameters, List[Parameters]]
    ):
        """Update the parameters of an experiment run"""
        pass

    @abstractmethod
    def update_exp_run_agg_literal_output(
        self, exp_run: RemoteExpRun, output: Dict[str, Union[int, str, float, bool]]
    ):
        pass

    @abstractmethod
    def update_exp_run_agg_complex_output(
        self, exp_run: RemoteExpRun, output: Dict[str, PyObject]
    ):
        pass

    @abstractmethod
    def update_example_literal_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: Optional[str] = None,
        output: Optional[Dict[str, Union[int, str, float, bool]]] = None,
    ):
        pass

    @abstractmethod
    def update_example_complex_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: Optional[str] = None,
        output: Optional[Dict[str, PyObject]] = None,
    ):
        pass
