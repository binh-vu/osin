from __future__ import annotations
from typing import Optional


from flask import jsonify, request
from gena import generate_api
from gena.api_generator import APIFuncs
from gena.deserializer import (
    deserialize_int,
    generate_deserializer,
    get_dataclass_deserializer,
    get_deserialize_list,
    get_deserializer_from_type,
)
from gena.serializer import get_peewee_serializer, get_dataclass_serializer
from osin.models.base import db
from osin.models.exp import Exp, ExpRun
from osin.models.report import (
    EXP_INDEX_FIELD,
    ExpReport,
    Report,
    ReportDisplayPosition,
)
from osin.models.report.index_schema import (
    AttrGetter,
    AttrValue,
    Index,
    InvalidIndexError,
)
from peewee import DoesNotExist
from werkzeug.exceptions import BadRequest, NotFound

expreport_bp = generate_api(ExpReport)
report_bp = generate_api(
    Report,
    skip_funcs={APIFuncs.create, APIFuncs.update},
    known_type_serializer={
        AttrGetter: lambda x: {
            "path": x.path,
            "values": list(x.values.keys()) if x.values is not None else None,
        }
    },
)

AttrGetter_values_deser = get_deserializer_from_type(Optional[list[AttrValue]], {})
report_deserializers = generate_deserializer(
    Report,
    known_type_deserializers={
        AttrGetter: get_dataclass_deserializer(
            AttrGetter,
            known_field_deserializers={
                "values": lambda x: {v: i for i, v in enumerate(resp)}
                if (resp := AttrGetter_values_deser(x)) is not None
                else None
            },
        )
    },
)
report_serializer = get_peewee_serializer(
    Report,
    known_type_serializer={
        AttrGetter: get_dataclass_serializer(
            AttrGetter,
            known_field_serializer={
                "values": lambda x: list(x.keys()) if x is not None else None
            },
        )
    },
)
exp_ids_deser = get_deserialize_list(deserialize_int)
pos_deser = get_dataclass_deserializer(
    ReportDisplayPosition, known_type_deserializers={}
)


@report_bp.route(f"/{report_bp.name}/get-attr-values", methods=["GET"])
def get_index_values():
    """Get possible values of an index"""
    exp_ids = request.args.get("exps")
    if exp_ids is None:
        raise BadRequest("Missing `exps` parameter")
    exp_ids = exp_ids.split(",")
    if not all(x.isdigit() for x in exp_ids):
        raise BadRequest("Invalid `exps` parameter")

    attr = request.args.get("attr")
    if attr is None:
        raise BadRequest("Missing `attr` parameter")

    if attr == EXP_INDEX_FIELD:
        exps = Exp.select(Exp.name).where(Exp.id.in_(exp_ids)).distinct()
        return jsonify({"items": [exp.name for exp in exps]})

    attrgetter = AttrGetter(path=tuple(attr.split(".")), values=None)
    runs = list(
        ExpRun.select(
            ExpRun.id, ExpRun.params, ExpRun.aggregated_primitive_outputs
        ).where(
            (ExpRun.exp.in_(exp_ids))
            & (ExpRun.is_deleted == False)
            & (ExpRun.is_successful == True)
        )
    )

    items = set()
    for run in runs:
        try:
            item = attrgetter.get_attribute_value(run)
        except KeyError:
            continue
        items.add(item)

    return jsonify({"items": list(items)})


@report_bp.route(f"/{report_bp.name}", methods=["POST"])
def create_report():
    posted_record = request.json

    if "exps" not in posted_record:
        raise BadRequest("Missing `exps` field")
    exp_ids = exp_ids_deser(posted_record["exps"])
    if len(exp_ids) == 0:
        raise BadRequest("Empty `exps` field")

    if "exp" not in posted_record:
        raise BadRequest("Missing `exp` field")
    main_exp_id = deserialize_int(posted_record["exp"])
    if main_exp_id not in exp_ids:
        raise BadRequest("Main exp must be in `exps` field")

    if "position" in posted_record:
        position = pos_deser(posted_record["position"])
    else:
        position = None

    raw_record = {}
    for name, field in Report._meta.fields.items():
        if name in posted_record and name != "id":
            try:
                raw_record[name] = report_deserializers[name](posted_record[name])
            except ValueError as e:
                raise ValueError(f"Field `{name}` {str(e)}")
    report = Report(**raw_record)

    with db:
        report.save()
        expreports = [{"exp_id": expid, "report_id": report.id} for expid in exp_ids]
        for r in expreports:
            if r["exp_id"] == main_exp_id:
                r["position"] = position
        ExpReport.insert_many(expreports).execute()

    return jsonify(report_serializer(report))


@report_bp.route(f"/{report_bp.name}/<id>", methods=["PUT"])
def update(id):
    try:
        record = Report.get_by_id(id)
    except DoesNotExist as e:
        raise NotFound(f"Record {id} does not exist")

    posted_record = request.get_json()
    if posted_record is None:
        raise BadRequest("Missing request body")

    if "exps" not in posted_record:
        raise BadRequest("Missing `exps` field")
    exp_ids = exp_ids_deser(posted_record["exps"])
    if len(exp_ids) == 0:
        raise BadRequest("Empty `exps` field")

    if "exp" not in posted_record:
        raise BadRequest("Missing `exp` field")
    main_exp_id = deserialize_int(posted_record["exp"])
    if main_exp_id not in exp_ids:
        raise BadRequest("Main exp must be in `exps` field")

    if "position" in posted_record:
        position = pos_deser(posted_record["position"])
    else:
        position = None

    for name, field in Report._meta.fields.items():
        if name in posted_record:
            try:
                value = report_deserializers[name](posted_record[name])
            except ValueError as e:
                raise ValueError(f"Field `{name}` {str(e)}")

            setattr(record, name, value)

    with db:
        record.save()
        ExpReport.delete().where(ExpReport.report_id == record.id).execute()
        expreports = [{"exp_id": expid, "report_id": record.id} for expid in exp_ids]
        for r in expreports:
            if r["exp_id"] == main_exp_id:
                r["position"] = position
        ExpReport.insert_many(expreports).execute()

    return jsonify(report_serializer(record))


@report_bp.route(f"/{report_bp.name}/<id>/data", methods=["GET"])
def get_report_data(id: int):
    """Get the report data"""

    # get the experiments
    report: Report = Report.get_by_id(id)
    exp_ids = [
        x.exp_id for x in ExpReport.select(ExpReport.exp).where(ExpReport.report == id)
    ]
    exps = {e.id: e for e in Exp.select(Exp.id, Exp.name).where(Exp.id.in_(exp_ids))}

    # gather runs of experiments
    runs = list(
        ExpRun.select(
            ExpRun.id, ExpRun.params, ExpRun.aggregated_primitive_outputs, ExpRun.exp
        ).where(
            (ExpRun.exp.in_(exp_ids))
            & (ExpRun.is_deleted == False)
            & (ExpRun.is_successful == True)
        )
    )
    for run in runs:
        run.exp = exps[run.exp_id]

    data = report.args.value.get_data(runs)
    return jsonify(
        {
            "type": report.args.type,
            "data": {
                "data": data.data,
                "xindex": [serialize_index(idx, exps) for idx in data.xindex],
                "yindex": [serialize_index(idx, exps) for idx in data.yindex],
            },
        }
    )


@report_bp.route(f"/{report_bp.name}/preview", methods=["POST"])
def preview_report():
    posted_record = request.json

    if "exps" not in posted_record:
        raise BadRequest("Missing `exps` field")
    exp_ids = exp_ids_deser(posted_record["exps"])
    if len(exp_ids) == 0:
        raise BadRequest("Empty `exps` field")
    exps = {e.id: e for e in Exp.select(Exp.id, Exp.name).where(Exp.id.in_(exp_ids))}

    raw_record = {}
    for name, field in Report._meta.fields.items():
        if name in posted_record and name != "id":
            try:
                raw_record[name] = report_deserializers[name](posted_record[name])
            except ValueError as e:
                raise ValueError(f"Field `{name}` {str(e)}")
    report = Report(**raw_record)

    # gather runs of experiments
    runs = list(
        ExpRun.select(
            ExpRun.id, ExpRun.params, ExpRun.aggregated_primitive_outputs, ExpRun.exp
        ).where(
            (ExpRun.exp.in_(exp_ids))
            & (ExpRun.is_deleted == False)
            & (ExpRun.is_successful == True)
        )
    )
    for run in runs:
        run.exp = exps[run.exp_id]

    data = report.args.value.get_data(runs)
    return jsonify(
        {
            "type": report.args.type,
            "data": {
                "data": data.data,
                "xindex": [serialize_index(idx, exps) for idx in data.xindex],
                "yindex": [serialize_index(idx, exps) for idx in data.yindex],
            },
        }
    )


def handle_internal_error(error):
    return jsonify({"message": str(error)}), 400


class ExperimentNotFound(Exception):
    pass


report_bp.register_error_handler(InvalidIndexError, handle_internal_error)
report_bp.register_error_handler(ExperimentNotFound, handle_internal_error)


def serialize_index(index: Index, exps: dict[int, Exp]):
    if index.attr[0] == EXP_INDEX_FIELD:
        if len(unk_exps := set(index.children.keys()).difference(exps.keys())) > 0:
            raise ExperimentNotFound(f"Experiments not found. Id: {list(unk_exps)}")

        return {
            "attr": ("Experiment",),
            "children": [
                (exps[eid].name, [serialize_index(c, exps) for c in lst])  # type: ignore
                for eid, lst in index.children.items()
            ],
        }
    return {
        "attr": index.attr,
        "children": [
            (v, [serialize_index(c, exps) for c in lst])
            for v, lst in index.children.items()
        ],
    }
