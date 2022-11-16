import atexit
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Union

import orjson
from loguru import logger
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExp, RemoteExpRun
from osin.misc import get_caller_python_script, orjson_dumps
from osin.models.base import init_db
from osin.models.exp import Exp, ExpRun, NestedPrimitiveOutput, RunMetadata
from osin.models.exp_data import ExampleData, Record
from osin.params_helper import DataClassInstance, param_as_dict
from osin.repository import OsinRepository
from osin.types import NestedPrimitiveOutputSchema, ParamSchema, PyObject
from osin.types.primitive_type import validate_primitive_data


class LocalOsin(Osin):
    def __init__(self, osin_dir: Union[Path, str]):
        self.osin_keeper = OsinRepository(osin_dir)
        self.cleanup_records: Set[int] = set()
        init_db(self.osin_keeper.get_db_file())

    def init_exp(
        self,
        name: str,
        version: int,
        description: Optional[str] = None,
        program: Optional[str] = None,
        params: Optional[Union[DataClassInstance, List[DataClassInstance]]] = None,
        aggregated_primitive_outputs: Optional[NestedPrimitiveOutputSchema] = None,
    ) -> RemoteExp:
        exps = (
            Exp.select().where(Exp.name == name).order_by(Exp.version.desc()).limit(1)  # type: ignore
        )
        if len(exps) == 0:
            if description is None or params is None:
                raise ValueError(
                    "Cannot create a new experiment without description and params"
                )
            exp = Exp.create(
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
        else:
            if exps[0].version > version:
                raise ValueError("Cannot create an older version of an experiment")
            elif exps[0].version == version:
                exp = exps[0]
            else:
                if description is None or params is None:
                    raise ValueError(
                        "Cannot create a new experiment without description and params"
                    )
                exp = Exp.create(
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
        db_exp: Exp = Exp.get_by_id(exp.id)

        output = {}
        for param in params if isinstance(params, list) else [params]:
            output.update(param_as_dict(param))
        exp_run = ExpRun.create(exp=db_exp, params=output)

        rundir = self.osin_keeper.get_exp_run_dir(db_exp, exp_run)
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
            Exp.update(
                aggregated_primitive_outputs=exp_run.exp.aggregated_primitive_outputs
            ).where(
                Exp.id == exp_run.exp.id
            ).execute()  # type: ignore
        else:
            has_invalid_agg_output_schema = (
                not exp_run.exp.aggregated_primitive_outputs.does_data_match(
                    exp_run.pending_output.aggregated.primitive
                )
            )

        self.osin_keeper.get_exp_run_success_file(exp_run.exp, exp_run).touch()
        ExpRun.update(
            is_finished=True,
            is_successful=is_successful,
            finished_time=exp_run.finished_time,
            has_invalid_agg_output_schema=has_invalid_agg_output_schema,
            metadata=metadata,
            aggregated_primitive_outputs=exp_run.pending_output.aggregated.primitive,
        ).where(
            ExpRun.id == exp_run.id
        ).execute()  # type: ignore

        self.cleanup_records.add(exp_run.id)

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
                    ExpRun.update(
                        is_finished=True,
                        is_successful=False,
                        finished_time=finished_time,
                    ).where(
                        ExpRun.id == exp_run.id
                    ).execute()  # type: ignore

                    raise
            else:
                finished_time = datetime.utcnow()
                ExpRun.update(
                    is_finished=True, is_successful=False, finished_time=finished_time
                ).where(
                    ExpRun.id == exp_run.id
                ).execute()  # type: ignore

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
