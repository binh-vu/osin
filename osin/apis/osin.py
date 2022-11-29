from abc import ABC, abstractmethod
import atexit
from datetime import datetime
from pathlib import Path
import shutil
from typing import Dict, List, Optional, Set, Union
from loguru import logger
import orjson

from osin.apis.remote_exp import RemoteExp, RemoteExpRun
from osin.misc import get_caller_python_script, orjson_dumps
from osin.models.exp import Exp, ExpRun, NestedPrimitiveOutput, RunMetadata
from osin.repository import OsinRepository
from osin.types import NestedPrimitiveOutputSchema, PyObject

from osin.params_helper import DataClassInstance, param_as_dict
from osin.types.param_schema import ParamSchema
from osin.types.primitive_type import validate_primitive_data
from osin.models.exp_data import ExampleData, Record


class Osin(ABC):
    """This class provides two methods to communicate with Osin, either locally or remotely via http protocol"""

    def __init__(self, osin_dir: Union[Path, str]):
        self.osin_keeper = OsinRepository(osin_dir)
        self.cleanup_records: Set[int] = set()

    @staticmethod
    def local(osin_dir: Union[Path, str]):
        from osin.apis.local_osin import LocalOsin

        return LocalOsin(osin_dir)

    @staticmethod
    def remote(endpoint: str, tmpdir: Union[Path, str] = "/tmp/osin"):
        from osin.apis.remote_osin import RemoteOsin

        return RemoteOsin(endpoint, tmpdir)

    def init_exp(
        self,
        name: str,
        version: int,
        description: Optional[str] = None,
        program: Optional[str] = None,
        params: Optional[Union[DataClassInstance, List[DataClassInstance]]] = None,
        aggregated_primitive_outputs: Optional[NestedPrimitiveOutputSchema] = None,
        update_param_schema: bool = False,
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
        exp = self._find_latest_exp(name)
        if exp is None:
            exp = self._create_exp(
                Exp(
                    name=name,
                    description=description,
                    version=version,
                    program=program or get_caller_python_script(),
                    params=[
                        ParamSchema.get_schema(p)
                        for p in (params if isinstance(params, list) else [params])
                    ],
                    aggregated_primitive_outputs=aggregated_primitive_outputs,
                )
            )
        else:
            if exp.version > version:
                raise ValueError("Cannot create an older version of an experiment")
            elif exp.version == version:
                if update_param_schema:
                    exp.params = [
                        ParamSchema.get_schema(p)
                        for p in (params if isinstance(params, list) else [params])
                    ]
                    self._update_exp(exp.id, exp, ["params"])
            else:
                exp = self._create_exp(
                    Exp(
                        name=name,
                        description=description,
                        version=version,
                        program=program or get_caller_python_script(),
                        params=[
                            ParamSchema.get_schema(p)
                            for p in (params if isinstance(params, list) else [params])
                        ],
                        aggregated_primitive_outputs=aggregated_primitive_outputs,
                    )
                )

        return RemoteExp(
            id=exp.id,
            name=exp.name,
            version=exp.version,
            params=exp.params,
            aggregated_primitive_outputs=exp.aggregated_primitive_outputs,
            osin=self,
        )

    def new_exp_run(
        self, exp: RemoteExp, params: Union[DataClassInstance, List[DataClassInstance]]
    ) -> RemoteExpRun:
        """Create a new run for an experiment."""
        output = {}
        for param in params if isinstance(params, list) else [params]:
            output.update(param_as_dict(param))
        exp_run = self._create_exprun(ExpRun(exp=exp.id, params=output))

        rundir = self.osin_keeper.get_exp_run_dir(exp, exp_run)
        if rundir.exists():
            shutil.rmtree(rundir)
        rundir.mkdir(parents=True)

        with open(rundir / "params.json", "wb") as f:
            f.write(orjson_dumps(output, option=orjson.OPT_INDENT_2))

        remote_exp_run = RemoteExpRun(
            id=exp_run.id,
            exp=exp,
            rundir=rundir,
            created_time=exp_run.created_time,
            finished_time=None,
            osin=self,
        )

        atexit.register(
            self._cleanup,
            exp_run=remote_exp_run,
        )
        return remote_exp_run

    def finish_exp_run(self, exp_run: RemoteExpRun, is_successful: bool = True):
        """Flush whatever remaining in experiment run that haven't sent to the server before stopping the experiment run."""
        exp_run.finished_time = datetime.utcnow()

        self.osin_keeper.get_exp_run_data_format(exp_run.exp, exp_run).save_run_data(
            exp_run.pending_output,
            self.osin_keeper.get_exp_run_data_file(exp_run.exp, exp_run),
        )

        metadata = RunMetadata.auto()
        # save metadata
        self.osin_keeper.get_exp_run_metadata_file(exp_run.exp, exp_run).write_bytes(
            orjson_dumps(
                {
                    "created_time": exp_run.created_time.isoformat(),
                    "finished_time": exp_run.finished_time.isoformat(),
                    "duration": (
                        exp_run.finished_time - exp_run.created_time
                    ).total_seconds(),
                    **metadata.to_dict(),
                },
                option=orjson.OPT_INDENT_2,
            )
        )
        # check if agg_lit_outputs matches with the schema.
        if exp_run.exp.aggregated_primitive_outputs is None:
            exp_run.exp.aggregated_primitive_outputs = (
                NestedPrimitiveOutputSchema.infer_from_data(
                    exp_run.pending_output.aggregated.primitive
                )
            )
            has_invalid_agg_output_schema = False
            self._update_exp(
                exp_run.exp.id,
                Exp(
                    aggregated_primitive_outputs=exp_run.exp.aggregated_primitive_outputs
                ),
                ["aggregated_primitive_outputs"],
            )
        else:
            has_invalid_agg_output_schema = (
                not exp_run.exp.aggregated_primitive_outputs.does_data_match(
                    exp_run.pending_output.aggregated.primitive
                )
            )

        self.osin_keeper.get_exp_run_success_file(exp_run.exp, exp_run).touch()
        self._upload_exprun(exp_run)
        self._update_exprun(
            exp_run.id,
            ExpRun(
                is_finished=True,
                is_successful=is_successful,
                finished_time=exp_run.finished_time,
                has_invalid_agg_output_schema=has_invalid_agg_output_schema,
                metadata=metadata,
                aggregated_primitive_outputs=exp_run.pending_output.aggregated.primitive,
            ),
            [
                "is_finished",
                "is_successful",
                "finished_time",
                "has_invalid_agg_output_schema",
                "metadata",
                "aggregated_primitive_outputs",
            ],
        )
        self.cleanup_records.add(exp_run.id)

    def update_exp_run_output(
        self,
        exp_run: RemoteExpRun,
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        if primitive is not None:
            validate_primitive_data(primitive)
            exp_run.pending_output.aggregated.primitive.update(primitive)
        if complex is not None:
            exp_run.pending_output.aggregated.complex.update(complex)

    def update_example_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: str = "",
        primitive: Optional[NestedPrimitiveOutput] = None,
        complex: Optional[Dict[str, PyObject]] = None,
    ):
        if primitive is not None:
            validate_primitive_data(primitive)

        if example_id in exp_run.pending_output.individual:
            exp_run.pending_output.individual[example_id].name = example_name
            exp_run.pending_output.individual[example_id].data.primitive.update(
                primitive or {}
            )
            exp_run.pending_output.individual[example_id].data.complex.update(
                complex or {}
            )
        else:
            exp_run.pending_output.individual[example_id] = ExampleData(
                id=example_id,
                name=example_name,
                data=Record(
                    primitive=primitive or {},
                    complex=complex or {},
                ),
            )

    def _cleanup(self, exp_run: RemoteExpRun):
        if exp_run.id not in self.cleanup_records:
            logger.debug("Cleaning up exp run: {}", exp_run.id)
            if exp_run.finished_time is None:
                # the user may forget to call finish_exp_run
                # we decide that it is still a failure
                try:
                    self.finish_exp_run(exp_run, is_successful=False)
                except:
                    finished_time = datetime.utcnow()
                    self._update_exprun(
                        exp_run.id,
                        ExpRun(
                            is_finished=True,
                            is_successful=False,
                            finished_time=finished_time,
                        ),
                        ["is_finished", "is_successful", "finished_time"],
                    )
                    raise
            else:
                finished_time = datetime.utcnow()
                self._update_exprun(
                    exp_run.id,
                    ExpRun(
                        is_finished=True,
                        is_successful=False,
                        finished_time=finished_time,
                    ),
                    ["is_finished", "is_successful", "finished_time"],
                )

    @abstractmethod
    def _find_latest_exp(self, name: str) -> Optional[Exp]:
        pass

    @abstractmethod
    def _create_exp(self, exp: Exp) -> Exp:
        pass

    @abstractmethod
    def _update_exp(self, exp_id: int, exp: Exp, fields: List[str]):
        pass

    @abstractmethod
    def _create_exprun(self, exprun: ExpRun) -> ExpRun:
        pass

    @abstractmethod
    def _update_exprun(self, exprun_id: int, exprun: ExpRun, fields: List[str]):
        pass

    @abstractmethod
    def _upload_exprun(self, exprun: RemoteExpRun):
        pass
