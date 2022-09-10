from pathlib import Path
import shutil
from typing import Dict, List, Optional, Union

import numpy as np
import orjson
from osin.models.parameters import Parameters, PyObject, PyObjectType
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExp, RemoteExpRun
from osin.data_keeper import OsinDataKeeper
from osin.models.base import init_db
from osin.models.exp import Exp, ExpRun
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
        params: Optional[Union[Parameters, List[Parameters]]] = None,
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
                params=Parameters.get_param_types(params),
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
                    params=Parameters.get_param_types(params),
                )

        return RemoteExp(
            id=exp.id,
            name=exp.name,
            version=exp.version,
            params=exp.params,
            osin=self,
        )

    def new_exp_run(self, exp: RemoteExp) -> RemoteExpRun:
        db_exp: Exp = Exp.get_by_id(exp.id)
        exp_run = ExpRun.create(exp=db_exp, rundir="")

        rundir = self.osin_keeper.get_exp_run_dir(db_exp, exp_run)
        if rundir.exists():
            shutil.rmtree(rundir)
        rundir.mkdir(parents=True)

        exp_run.rundir = str(rundir)
        exp_run.save()

        return RemoteExpRun(id=exp_run.id, exp=exp, rundir=rundir, osin=self)

    def finish_exp_run(self, exp_run: RemoteExpRun):
        with h5py.File(
            self.osin_keeper.get_exp_run_data_file(exp_run.exp, exp_run), "a"
        ) as f:
            agg_group = f.create_group("aggregated")
            for key, value in exp_run.pending_literal_output.get(
                "aggregated", {}
            ).items():
                agg_group[key] = value
            for key, value in exp_run.pending_complex_output.get(
                "aggregated", {}
            ).items():
                agg_group[key] = value

            ind_group = f.create_group("individual")
            for example_id, value in exp_run.pending_literal_output.get(
                "individual", {}
            ).items():
                ind_group[example_id] = value
            for example_id, value in exp_run.pending_complex_output.get(
                "individual", {}
            ).items():
                ind_group[example_id] = value

        self.osin_keeper.get_exp_run_success_file(exp_run.exp, exp_run).touch()
        ExpRun.update(is_finished=True).where(ExpRun.id == exp_run.id).execute()  # type: ignore

    def update_exp_run_params(
        self, exp_run: RemoteExpRun, params: Union[Parameters, List[Parameters]]
    ):
        """Update the parameters of an experiment run"""
        output = {}
        for param in params if isinstance(params, list) else [params]:
            output.update(param.as_dict())

        ExpRun.update(params=output).where(ExpRun.id == exp_run.id).execute()  # type: ignore
        with open(exp_run.rundir / "params.json", "wb") as f:
            f.write(orjson.dumps(output, option=orjson.OPT_INDENT_2))

    def update_exp_run_agg_literal_output(
        self, exp_run: RemoteExpRun, output: Dict[str, Union[int, str, float, bool]]
    ):
        if "aggregated" not in exp_run.pending_literal_output:
            exp_run.pending_literal_output["aggregated"] = {}
        exp_run.pending_literal_output["aggregated"].update(output)

    def update_exp_run_agg_complex_output(
        self, exp_run: RemoteExpRun, output: Dict[str, PyObject]
    ):
        if "aggregated" not in exp_run.pending_complex_output:
            exp_run.pending_complex_output["aggregated"] = {}
        exp_run.pending_complex_output["aggregated"].update(output)

    def update_example_literal_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: Optional[str] = None,
        output: Optional[Dict[str, Union[int, str, float, bool]]] = None,
    ):
        if "individual" not in exp_run.pending_literal_output:
            exp_run.pending_literal_output["individual"] = {}
        exp_run.pending_literal_output["individual"][example_id] = {
            "id": example_id,
            "name": example_name,
            "output": output,
        }

    def update_example_complex_output(
        self,
        exp_run: RemoteExpRun,
        example_id: str,
        example_name: Optional[str] = None,
        output: Optional[Dict[str, PyObject]] = None,
    ):
        if "individual" not in exp_run.pending_complex_output:
            exp_run.pending_complex_output["individual"] = {}
        exp_run.pending_complex_output["individual"][example_id] = {
            "id": example_id,
            "name": example_name,
            "output": output,
        }
