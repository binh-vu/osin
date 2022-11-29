from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import certifi
import requests
from gena.deserializer import get_deserializer_from_type
from loguru import logger
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExpRun
from osin.models.exp import Exp, ExpRun
from osin.repository import OsinRepository
from osin.types import NestedPrimitiveOutputSchema, ParamSchema

ParamSchema_deser = get_deserializer_from_type(ParamSchema, {})
NestedPrimitiveOutputSchema_deser = get_deserializer_from_type(
    NestedPrimitiveOutputSchema, {}
)


class RemoteOsin(Osin):
    def __init__(self, endpoint: str, tmpdir: Path | str):
        super().__init__(tmpdir)
        self.endpoint = endpoint
        if self.endpoint.endswith("/"):
            self.endpoint = self.endpoint[:-1]
        self.tmpdir = Path(tmpdir)

    def _get(self, url: str, params: dict) -> dict:
        resp = requests.get(f"{self.endpoint}{url}", params=params)
        try:
            assert resp.status_code == 200
        except:
            logger.error(resp.text)
            raise
        return resp.json()

    def _post(self, url: str, data: dict) -> dict:
        resp = requests.post(f"{self.endpoint}{url}", json=data)
        try:
            assert resp.status_code == 200
        except:
            logger.error(resp.text)
            raise
        return resp.json()

    def _put(self, url: str, data: dict) -> dict:
        resp = requests.put(f"{self.endpoint}{url}", json=data)
        try:
            assert resp.status_code == 200
        except:
            logger.error(resp.text)
            raise
        return resp.json()

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

    def _find_latest_exp(self, name: str) -> Optional[Exp]:
        exps = self._get(
            "/api/exp",
            {
                "name": name,
                "sorted_by": "-version",
                "limit": 1,
            },
        )["items"]
        if len(exps) == 0:
            return None
        else:
            exp = exps[0]
            return Exp(
                id=exp["id"],
                name=exp["name"],
                version=exp["version"],
                description=exp["description"],
                program=exp["program"],
                params=[ParamSchema_deser(p) for p in exp["params"]],
                aggregated_primitive_outputs=NestedPrimitiveOutputSchema(
                    exp["aggregated_primitive_outputs"]
                )
                if exp["aggregated_primitive_outputs"] is not None
                else None,
            )

    def _create_exp(self, exp: Exp) -> Exp:
        if exp.description is None or exp.params is None:
            raise ValueError(
                "Cannot create a new experiment without description and params"
            )
        obj = self._post(
            "/api/exp",
            {
                "name": exp.name,
                "version": exp.version,
                "description": exp.description,
                "program": exp.program,
                "params": [asdict(p) for p in exp.params],
                "aggregated_primitive_outputs": asdict(exp.aggregated_primitive_outputs)
                if exp.aggregated_primitive_outputs is not None
                else None,
            },
        )
        exp.id = obj["id"]
        return exp

    def _update_exp(self, exp_id: int, exp: Exp, fields: List[str]):
        data = {field: getattr(exp, field) for field in fields}
        if "params" in fields:
            data["params"] = [asdict(p) for p in exp.params]
        if (
            "aggregated_primitive_outputs" in fields
            and exp.aggregated_primitive_outputs is not None
        ):
            data["aggregated_primitive_outputs"] = asdict(
                exp.aggregated_primitive_outputs
            )
        self._put(f"/api/exp/{exp_id}", data)

    def _create_exprun(self, exprun: ExpRun) -> ExpRun:
        obj = self._post(
            "/api/exprun",
            {
                "exp_id": exprun.exp_id,
                "is_deleted": exprun.is_deleted,
                "is_finished": exprun.is_finished,
                "is_successful": exprun.is_successful,
                "has_invalid_agg_output_schema": exprun.has_invalid_agg_output_schema,
                "created_time": exprun.created_time.isoformat(),
                "finished_time": exprun.finished_time.isoformat()
                if exprun.finished_time is not None
                else None,
                "params": exprun.params,
                "metadata": asdict(exprun.metadata)
                if exprun.metadata is not None
                else None,
                "aggregated_primitive_outputs": exprun.aggregated_primitive_outputs,
            },
        )
        exprun.id = obj["id"]
        return exprun

    def _update_exprun(self, exprun_id: int, exprun: ExpRun, fields: List[str]):
        data = {field: getattr(exprun, field) for field in fields}
        if "metadata" in fields and exprun.metadata is not None:
            data["metadata"] = asdict(exprun.metadata)
        if "created_time" in fields:
            data["created_time"] = exprun.created_time.isoformat()
        if "finished_time" in fields and exprun.finished_time is not None:
            data["finished_time"] = exprun.finished_time.isoformat()

        self._put(
            f"/api/exprun/{exprun_id}",
            data,
        )

    def _upload_exprun(self, exprun: RemoteExpRun):
        files = {}
        for file in exprun.rundir.iterdir():
            if file.suffix in OsinRepository.ALLOWED_EXTENSIONS:
                files[file.stem] = (file.name, file.read_bytes())

        resp = requests.post(
            f"{self.endpoint}/api/exprun/{exprun.id}/upload", files=files
        )
        try:
            assert resp.status_code == 200
        except:
            logger.error(resp.text)
            raise
