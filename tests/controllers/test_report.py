from typing import List, Tuple, Type
from flask import Flask
from gena.serializer import get_peewee_serializer
from osin.models.report import Report, ReportArgs, ReportType, TableReportArgs, Index

import pytest
from gena.api_testsuite import APITestSuite
from osin.apis.remote_exp import RemoteExpRun
from osin.app import app
from peewee import Model


class TestReport(APITestSuite):
    serializer = get_peewee_serializer(Report)

    @pytest.fixture
    def app(self) -> Flask:
        """Flask application"""
        return app

    @pytest.fixture(scope="session")
    def model(self) -> Type[Model]:
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
                    value=TableReportArgs(
                        xaxis=[Index(("dataset",))],
                        yaxis=[Index(("method",))],
                        zvalues=[Index(("precision",))],
                    ),
                ),
            )
        ]

        raw_records = []
        for r in records:
            r = TestReport.serializer(r)
            del r["id"]
            raw_records.append(r)

        return raw_records
