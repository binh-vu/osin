from pathlib import Path
from typing import List, Tuple, Type
from flask import Flask
from flask.testing import FlaskClient
from gena.serializer import get_peewee_serializer

import pytest
from gena.api_testsuite import APITestSuite
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExpRun
from osin.app import app
from osin.models import init_db
from osin.models.exp import ExpRun
from peewee import Model, SqliteDatabase

from osin.models.parameters import Parameters


@pytest.fixture
def test_db(clean_db: SqliteDatabase, tmp_path: Path) -> List[RemoteExpRun]:
    class Args(Parameters):
        dataset: str
        method: str

    params = Args().parse_args(["--dataset", "iris", "--method", "Nearest Neighbors"])

    osin = Osin.local(osin_dir=tmp_path)
    exp = osin.init_exp(
        name="sklearn.classification",
        version=1,
        description="Testing sklearn classifiers on some sklearn datasets",
        params=params,
    )

    exp_run1 = exp.new_exp_run()
    exp_run1.update_params(params).update_agg_primitive_output(
        dict(precision=0.6, recall=0.8, support=100)
    ).update_example_primitive_output(
        "e01", output=dict(precision=1.0, recall=0.0)
    ).update_example_primitive_output(
        "e02", output=dict(precision=0.5, recall=0.5)
    ).finish_exp_run()

    exp_run2 = exp.new_exp_run()
    exp_run2.update_params(params).update_agg_primitive_output(
        dict(precision=0.7, recall=0.8, support=105)
    ).update_example_primitive_output(
        "e01", output=dict(precision=0.9, recall=0.1)
    ).update_example_primitive_output(
        "e02", output=dict(precision=0.6, recall=0.6)
    ).finish_exp_run()

    return [exp_run1, exp_run2]


class TestExpRun(APITestSuite):
    serializer = get_peewee_serializer(ExpRun)

    @pytest.fixture()
    def app(self) -> Flask:
        """Flask application"""
        return app

    @pytest.fixture(scope="session")
    def model(self) -> Type[Model]:
        return ExpRun

    @pytest.fixture()
    def existed_resources(
        self, test_db: List[RemoteExpRun]
    ) -> List[Tuple[Model, dict]]:
        r0 = ExpRun.get_by_id(1)
        r1 = ExpRun.get_by_id(2)

        return [(r0, TestExpRun.serializer(r0)), (r1, TestExpRun.serializer(r1))]
