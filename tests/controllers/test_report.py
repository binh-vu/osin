from typing import List, Tuple, Type

import pytest
from flask import Flask
from flask.testing import FlaskClient
from gena.api_testsuite import APITestSuite
from gena.serializer import get_peewee_serializer
from peewee import Model

from osin.apis.remote_exp import RemoteExpRun
from osin.app import app
from osin.models.report import (
    AttrGetter,
    BaseReport,
    IndexSchema,
    Report,
    ReportArgs,
    ReportType,
)


class TestReport(APITestSuite):
    serializer = get_peewee_serializer(Report)

    @pytest.fixture
    def app(self) -> Flask:
        """Flask application"""
        return app

    @pytest.fixture(scope="session")
    def model(self) -> Type[Report]:
        return Report

    @pytest.fixture
    def existed_resources(
        self, test_db: List[RemoteExpRun]
    ) -> List[Tuple[Model, dict]]:
        return []

    @pytest.fixture
    def new_resources(self, test_db: List[RemoteExpRun]) -> list[dict]:
        records = [
            Report(
                name="report1",
                description="report1",
                args=ReportArgs(
                    type=ReportType.Table,
                    value=BaseReport(
                        x_axis=IndexSchema([AttrGetter(("dataset",))], [[]], []),
                        y_axis=IndexSchema([AttrGetter(("method",))], [[]], []),
                        z_values=[(None, [AttrGetter(("precision",))])],
                    ),
                ),
            )
        ]

        raw_records = []
        for r in records:
            r = TestReport.serializer(r)
            del r["id"]
            r["exp"] = test_db[0].exp.id
            r["exps"] = [test_db[0].exp.id]
            raw_records.append(r)

        return raw_records
