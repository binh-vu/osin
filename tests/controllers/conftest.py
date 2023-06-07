from dataclasses import dataclass
from pathlib import Path
from typing import List
import yada

import pytest
from osin.apis.osin import Osin
from osin.apis.remote_exp import RemoteExpRun
from peewee import SqliteDatabase


@pytest.fixture
def test_db(clean_db: SqliteDatabase, tmp_path: Path) -> List[RemoteExpRun]:
    @dataclass
    class Args:
        dataset: str
        method: str

    params = {
        "": yada.Parser1(Args).parse_args(
            ["--dataset", "iris", "--method", "Nearest Neighbors"]
        )
    }

    osin = Osin.local(osin_dir=tmp_path)
    exp = osin.init_exp(
        name="sklearn.classification",
        version=1,
        description="Testing sklearn classifiers on some sklearn datasets",
        params=params,
    )

    exp_run1 = exp.new_exp_run(params)
    exp_run1.update_output(
        primitive=dict(precision=0.6, recall=0.8, support=100)
    ).update_example_output(
        "e01", primitive=dict(precision=1.0, recall=0.0)
    ).update_example_output(
        "e02", primitive=dict(precision=0.5, recall=0.5)
    ).finish()

    exp_run2 = exp.new_exp_run(params)
    exp_run2.update_output(
        primitive=dict(precision=0.7, recall=0.8, support=105)
    ).update_example_output(
        "e01", primitive=dict(precision=0.9, recall=0.1)
    ).update_example_output(
        "e02", primitive=dict(precision=0.6, recall=0.6)
    ).finish()

    return [exp_run1, exp_run2]
