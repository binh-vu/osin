from curses.ascii import isdigit
from typing import Optional, Union, cast
from flask import jsonify, request
from loguru import logger
import orjson
from gena import generate_api
from dateutil.parser import parse
from peewee import DoesNotExist
from osin.models.exp import Exp, ExpRun
from osin.types import PyObject
from osin.misc import h5_read_nested_primitive_object
from werkzeug.exceptions import BadRequest, NotFound
from osin.data_keeper import OsinDataKeeper
import h5py

exp_bp = generate_api(Exp)
exp_run_bp = generate_api(
    ExpRun,
    deserializers={
        "params": orjson.loads,
        "finished_time": parse,
        "created_time": parse,
        "aggregated_primitive_outputs": orjson.loads,
    },
)


@exp_run_bp.route(f"/{exp_run_bp.name}/<id>/data", methods=["GET"])
def fetch_exp_run_data(id: int):
    try:
        exp_run: ExpRun = ExpRun.get_by_id(id)
    except DoesNotExist:
        raise NotFound(f"ExpRun with id {id} does not exist")

    osin = OsinDataKeeper.get_instance()
    format = osin.get_exp_run_data_format(exp_run.exp, exp_run)
    h5file = osin.get_exp_run_data_file(exp_run.exp, exp_run)

    limit = request.args.get("limit", "50")
    if not limit.isdigit():
        raise BadRequest("limit must be an integer")
    limit = int(limit)

    offset = request.args.get("offset", "0")
    if not offset.isdigit():
        raise BadRequest("offset must be an integer")
    offset = int(offset)

    if "fields" in request.args:
        fields = {}
        for field in request.args["fields"].split(","):
            parts = field.split(".")
            if len(parts) == 0 or len(parts) > 2:
                raise BadRequest(f"Invalid field: {field}")
            if parts[0] not in ["aggregated", "individual"]:
                raise BadRequest(f"Invalid field {field}")
            if len(parts) == 1:
                fields[parts[0]] = {"primitive", "complex"}
            else:
                if parts[1] not in {"primitive", "complex"}:
                    raise BadRequest(f"Invalid field {field}")
                fields[parts[0]] = {parts[1]}
    else:
        fields = None

    if "sorted_by" in request.args:
        sorted_by = request.args["sorted_by"]
        if sorted_by.startswith("-"):
            sorted_by = sorted_by[1:]
            sorted_order = "descending"
        else:
            sorted_order = "ascending"
    else:
        sorted_by = None
        sorted_order = "ascending"

    # try:
    exp_run_data = format.load_exp_run_data(
        h5file, fields, limit, offset, sorted_by, sorted_order
    )
    # except KeyError:
    #     logger.exception("Error loading exp run data")
    #     raise BadRequest(f"Invalid sort_by {sorted_by}")

    return jsonify(exp_run_data.to_dict())
