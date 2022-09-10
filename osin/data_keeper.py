from pathlib import Path
from typing import Union, TYPE_CHECKING

from osin.models.exp import Exp, ExpRun
from osin.apis.remote_exp import RemoteExp, RemoteExpRun


class OsinDataKeeper:
    def __init__(self, osin_dir: Union[Path, str]):
        self.osin_dir = Path(osin_dir)
        self.osin_dir.mkdir(exist_ok=True, parents=True)

    def get_db_file(self) -> Path:
        return self.osin_dir / "osin.db"

    def get_exp_dir(
        self, exp: Union[Exp, RemoteExp], create_if_missing: bool = True
    ) -> Path:
        expdir = self.osin_dir / exp.name / str(exp.version)
        if create_if_missing:
            expdir.mkdir(parents=True, exist_ok=True)
        return expdir

    def get_exp_run_dir(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_dir(exp) / f"run_{exp_run.id:03d}"

    def get_exp_run_data_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "data.h5"

    def get_exp_run_success_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "_SUCCESS"
