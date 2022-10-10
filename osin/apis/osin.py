from abc import ABC, abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING, Dict, List, Optional, Union

from osin.apis.remote_exp import RemoteExp, RemoteExpRun
from osin.models.exp import NestedPrimitiveOutput
from osin.types import NestedPrimitiveOutputSchema, PyObject

from osin.params_helper import DataClassInstance


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
        program: Optional[str] = None,
        params: Optional[Union[DataClassInstance, List[DataClassInstance]]] = None,
        aggregated_primitive_outputs: Optional[NestedPrimitiveOutputSchema] = None,
    ) -> RemoteExp:
        """Init an experiment in Osin.

        If the experiment already exists, the input version must be the latest one, and the parameters must match.
        If the experiment does not exist, it will be created with the given parameters.

        Args:
            name: Name of the experiment
            version: Version of the experiment
            description: Description of the experiment
            program: The python program to invoke the experiment
            params: The parameters of the experiment.
            aggregated_primitive_outputs: The aggregated outputs of the experiment.
                If not provided, it will be inferred automatically when the experiment is run.
        """
        pass

    @abstractmethod
    def new_exp_run(
        self, exp: RemoteExp, params: Union[DataClassInstance, List[DataClassInstance]]
    ) -> RemoteExpRun:
        """Create a new run for an experiment."""
        pass

    @abstractmethod
    def finish_exp_run(self, exp_run: RemoteExpRun):
        """Flush whatever remaining in experiment run that haven't sent to the database to the database before stopping the experiment run."""
        pass

    @abstractmethod
    def update_exp_run_output(
        self,
        exp_run: RemoteExpRun,
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        pass

    @abstractmethod
    def update_example_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: str = "",
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        pass
