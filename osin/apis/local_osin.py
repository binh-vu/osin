from datetime import datetime
import os
from pathlib import Path
import shutil
import socket
from typing import Dict, List, Optional, Union

import numpy as np
import orjson
import psutil
from osin.misc import get_caller_python_script, h5_update_nested_primitive_object
from osin.types import Parameters, NestedPrimitiveOutputSchema, PyObject, PyObjectType
from osin.apis.osin import Osin
from osin.apis.remote_exp import ExampleOutput, OutputType, RemoteExp, RemoteExpRun
from osin.data_keeper import OsinDataKeeper
from osin.models.base import init_db
from osin.models.exp import Exp, ExpRun, NestedPrimitiveOutput, RunMetadata
import h5py


class LocalOsin(Osin):
    def __init__(self, osin_dir: Union[Path, str]):
        self.osin_keeper = OsinDataKeeper(osin_dir)
        init_db(self.osin_keeper.get_db_file())

    def init_exp(
        self,
        name: str,
        version: int,
        description: Optional[str] = None,
        program: Optional[str] = None,
        params: Optional[Union[Parameters, List[Parameters]]] = None,
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
                params=Parameters.get_param_types(params),
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
                    params=Parameters.get_param_types(params),
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
        self, exp: RemoteExp, params: Union[Parameters, List[Parameters]]
    ) -> RemoteExpRun:
        db_exp: Exp = Exp.get_by_id(exp.id)

        output = {}
        for param in params if isinstance(params, list) else [params]:
            output.update(param.as_dict())
        exp_run = ExpRun.create(exp=db_exp, rundir="", params=output)

        rundir = self.osin_keeper.get_exp_run_dir(db_exp, exp_run)
        if rundir.exists():
            shutil.rmtree(rundir)
        rundir.mkdir(parents=True)

        exp_run.rundir = str(rundir)
        exp_run.save()

        with open(rundir / "params.json", "wb") as f:
            f.write(orjson.dumps(output, option=orjson.OPT_INDENT_2))

        return RemoteExpRun(
            id=exp_run.id,
            exp=exp,
            rundir=rundir,
            created_time=exp_run.created_time,
            finished_time=exp_run.created_time,
            osin=self,
        )

    def finish_exp_run(self, exp_run: RemoteExpRun):
        exp_run.finished_time = datetime.utcnow()

        with h5py.File(
            self.osin_keeper.get_exp_run_data_file(exp_run.exp, exp_run), "a"
        ) as f:
            agg_group = f.create_group("aggregated")

            if len(exp_run.pending_output.aggregated.primitive) > 0:
                h5_update_nested_primitive_object(
                    agg_group, exp_run.pending_output.aggregated.primitive
                )

            agg_lit_outputs = {}
            for key, value in exp_run.pending_output.aggregated.primitive.items():
                agg_lit_outputs[key] = value
            for key, value in exp_run.pending_output.aggregated.complex.items():
                agg_group[key] = value

            ind_group = f.create_group("individual")
            for (
                example_id,
                example,
            ) in exp_run.pending_output.individual.items():
                grp = ind_group.create_group(example_id)
                h5_update_nested_primitive_object(grp, example.output.primitive)
                for key, obj in example.output.complex.items():
                    grp[key] = obj.serialize_hdf5()

        metadata = RunMetadata.auto()
        # save metadata
        self.osin_keeper.get_exp_run_metadata_file(exp_run.exp, exp_run).write_bytes(
            orjson.dumps(
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
                NestedPrimitiveOutputSchema.infer_from_data(agg_lit_outputs)
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
                    agg_lit_outputs
                )
            )

        self.osin_keeper.get_exp_run_success_file(exp_run.exp, exp_run).touch()
        ExpRun.update(
            is_finished=True,
            is_successful=True,
            finished_time=exp_run.finished_time,
            has_invalid_agg_output_schema=has_invalid_agg_output_schema,
            metadata=metadata,
            aggregated_primitive_outputs=agg_lit_outputs,
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
        if example_id in exp_run.pending_output.individual:
            exp_run.pending_output.individual[example_id].name = example_name
            exp_run.pending_output.individual[example_id].output.primitive.update(
                primitive or {}
            )
            exp_run.pending_output.individual[example_id].output.complex.update(
                complex or {}
            )
        else:
            exp_run.pending_output.individual[example_id] = ExampleOutput(
                id=example_id,
                name=example_name,
                output=OutputType(
                    primitive=primitive or {},
                    complex=complex or {},
                ),
            )
