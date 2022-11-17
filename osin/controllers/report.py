from __future__ import annotations


from flask import jsonify, request
from gena import generate_api
from gena.api_generator import APIFuncs
from gena.deserializer import (
    deserialize_int,
    generate_deserializer,
    get_dataclass_deserializer,
    get_deserialize_list,
)
from gena.serializer import get_peewee_serializer
from osin.models.base import db
from osin.models.exp import Exp, ExpRun
from osin.models.report import (
    EXPNAME_INDEX_FIELD,
    ExpReport,
    Index,
    Report,
    ReportDisplayPosition,
    ReportType,
)
from peewee import DoesNotExist
from werkzeug.exceptions import BadRequest, NotFound

expreport_bp = generate_api(ExpReport)
report_bp = generate_api(Report, skip_funcs={APIFuncs.create, APIFuncs.update})
report_deserializers = generate_deserializer(Report)
report_serializer = get_peewee_serializer(Report)
exp_ids_deser = get_deserialize_list(deserialize_int)
pos_deser = get_dataclass_deserializer(
    ReportDisplayPosition, known_type_deserializers={}
)


@report_bp.route(f"/{report_bp.name}/get-index-values", methods=["GET"])
def get_index_values():
    """Get possible values of an index"""
    property = request.args.get("property")
    if property not in ("params", "aggregated_primitive_outputs"):
        raise BadRequest(
            "Invalid property. Must be one of `params` or `aggregated_primitive_outputs`"
        )

    exp_ids = request.args.get("exps")
    if exp_ids is None:
        raise BadRequest("Missing `exps` parameter")
    exp_ids = exp_ids.split(",")
    if not all(x.isdigit() for x in exp_ids):
        raise BadRequest("Invalid `exps` parameter")

    dim = request.args.get("dim")
    if dim is None:
        raise BadRequest("Missing `dim` parameter")

    if dim == EXPNAME_INDEX_FIELD:
        exps = Exp.select(Exp.name).where(Exp.id.in_(exp_ids)).distinct()
        return jsonify({"items": [exp.name for exp in exps]})

    index = Index(index=tuple(dim.split(".")), property=property)
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
            item = index.get_value(run)
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

    if report.args.get_experiment_ids().difference(exp_ids):
        raise BadRequest(
            f"The report uses experiments that are not in `exps`: {report.args.get_experiment_ids().difference(exp_ids)}"
        )

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

    # group runs by the index
    if report.args.type == ReportType.Table:
        xaxis = report.args.value.xaxis
        yaxis = report.args.value.yaxis
        zvalues = report.args.value.zvalues

        xitems, xitems_schema = xaxis.populate_values(runs).get_values()
        yitems, yitems_schema = yaxis.populate_values(runs).get_values()

        yitems_dict = {item: {} for item in yitems}
        data = {item: {item: {} for item in yitems} for item in xitems}

        for run in runs:
            xitem = xaxis.get_value(run)
            if xitem not in data:
                continue
            yitem = yaxis.get_value(run)
            if yitem not in yitems_dict:
                continue

            zitems = data[xitem][yitem]
            for idx in zvalues:
                if isinstance(idx, Index):
                    zitem = idx.index
                    idxvalue = idx.get_value(run)
                elif isinstance(idx[run.exp_id], Index):
                    zitem = idx[run.exp_id].index
                    idxvalue = idx[run.exp_id].get_value(run)
                else:
                    zitem, idxvalue = idx[run.exp_id], idx[run.exp_id]
                if zitem not in zitems:
                    zitems[zitem] = []
                zitems[zitem].append({"value": idxvalue, "run_id": run.id})

        # output as data frame
        output = []
        for xitem, yitems_ in data.items():
            for yitem, zitems in yitems_.items():
                output.append(
                    {
                        "x": xitem,
                        "y": yitem,
                        "z": [
                            {
                                "name": zitem,
                                "value": value["value"],
                                "run_id": value["run_id"],
                            }
                            for zitem, values in zitems.items()
                            for value in values
                        ],
                    }
                )

        return jsonify(
            {
                "data": output,
                "xitems": xitems,
                "xitems_schema": xitems_schema,
                "yitems": yitems,
                "yitems_schema": yitems_schema,
            }
        )

    raise Exception("Unsupported report type")
