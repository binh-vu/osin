from dataclasses import dataclass
from pathlib import Path

import pytest, yada
from osin.apis.osin import Osin
from osin.models.exp import ExpRun
from peewee import SqliteDatabase
from playhouse.shortcuts import model_to_dict


@dataclass
class Args:
    dataset: str
    method: str


def test_smoke(clean_db: SqliteDatabase, tmp_path: Path):
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

    exp_run_dbs = [model_to_dict(m, recurse=False) for m in ExpRun.select()]
    assert exp_run_dbs == [
        dict(
            id=1,
            exp=exp.id,
            is_deleted=False,
            is_finished=True,
            is_successful=True,
            has_invalid_agg_output_schema=False,
            created_time=exp_run1.created_time,
            finished_time=exp_run1.finished_time,
            params={
                "": {
                    "dataset": "iris",
                    "method": "Nearest Neighbors",
                }
            },
            metadata=exp_run_dbs[0]["metadata"],
            aggregated_primitive_outputs={
                "precision": 0.6,
                "recall": 0.8,
                "support": 100,
            },
        ),
        dict(
            id=2,
            exp=exp.id,
            is_deleted=False,
            is_finished=True,
            is_successful=True,
            has_invalid_agg_output_schema=False,
            created_time=exp_run2.created_time,
            finished_time=exp_run2.finished_time,
            params={
                "": {
                    "dataset": "iris",
                    "method": "Nearest Neighbors",
                }
            },
            metadata=exp_run_dbs[1]["metadata"],
            aggregated_primitive_outputs={
                "precision": 0.7,
                "recall": 0.8,
                "support": 105,
            },
        ),
    ]
