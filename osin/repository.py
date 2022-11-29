from pathlib import Path
from typing import Optional, Union

from osin.models.exp import Exp, ExpRun
from osin.formats import Hdf5Format
from osin.apis.remote_exp import RemoteExp, RemoteExpRun
from slugify import slugify


class OsinRepository:
    instance = None
    ALLOWED_EXTENSIONS = {".json", ".h5"}

    def __init__(self, osin_dir: Union[Path, str]):
        self.osin_dir = Path(osin_dir)
        self.osin_dir.mkdir(exist_ok=True, parents=True)

    @staticmethod
    def get_instance(osin_dir: Optional[Union[Path, str]] = None) -> "OsinRepository":
        if OsinRepository.instance is None:
            assert osin_dir is not None
            OsinRepository.instance = OsinRepository(osin_dir)
        elif osin_dir is not None:
            assert OsinRepository.instance.osin_dir == Path(osin_dir)
        return OsinRepository.instance

    def get_db_file(self) -> Path:
        return self.osin_dir / "osin.db"

    def get_exp_dir(
        self, exp: Union[Exp, RemoteExp], create_if_missing: bool = True
    ) -> Path:
        expdir = self.osin_dir / f"{slugify(exp.name)}-{exp.id}" / str(exp.version)
        if create_if_missing:
            expdir.mkdir(parents=True, exist_ok=True)
        return expdir

    def get_exp_run_dir(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_dir(exp) / f"run_{exp_run.id:03d}"

    def get_exp_run_params_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "params.json"

    def get_exp_run_metadata_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "metadata.json"

    def get_exp_run_data_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "data.h5"

    def get_exp_run_data_format(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Hdf5Format:
        return Hdf5Format()

    def get_exp_run_success_file(
        self, exp: Union[Exp, RemoteExp], exp_run: Union[ExpRun, RemoteExpRun]
    ) -> Path:
        return self.get_exp_run_dir(exp, exp_run) / "_SUCCESS"
