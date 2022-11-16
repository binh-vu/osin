from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Type
from flask import Flask
from flask.testing import FlaskClient
from gena.serializer import get_peewee_serializer
import yada

import pytest
from gena.api_testsuite import APITestSuite
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExpRun
from osin.app import app
from osin.models import init_db
from osin.models.exp import ExpRun
from peewee import Model, SqliteDatabase


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

    @pytest.fixture()
    def new_resources(self) -> list[dict]:
        return []
