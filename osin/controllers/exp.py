from datetime import datetime
from flask import jsonify, request
from gena import generate_api
from peewee import DoesNotExist, fn
from osin.misc import get_extension, identity
from osin.models.exp import Exp, ExpRun
from werkzeug.exceptions import BadRequest, NotFound
from osin.repository import OsinRepository
from werkzeug.utils import secure_filename

exp_bp = generate_api(Exp)
exprun_bp = generate_api(
    ExpRun,
    deserializers={
        "params": identity,
        # seems that with timezone, peewee cannot parse back to datetime
        # "finished_time": lambda x: parse(x).replace(tzinfo=None),
        # "created_time": lambda x: parse(x).replace(tzinfo=None),
        "aggregated_primitive_outputs": identity,
    },
)


@exprun_bp.route(f"/{exprun_bp.name}/activity", methods=["GET"])
def run_activity():
    if "since" in request.args:
        try:
            since = datetime.utcfromtimestamp(int(request.args.get("since", 0)) / 1000)
        except:
            raise BadRequest("since must be milliseconds since epoch")
    else:
        since = None
    day = fn.Strftime("%Y-%m-%d", ExpRun.created_time).alias("day")
    query = ExpRun.select(
        fn.Count(ExpRun.id).alias("n_runs"),
        day,
    )

    if since is not None:
        query = query.where(ExpRun.created_time > since)

    query = query.group_by(day)

    return jsonify([{"count": r.n_runs, "date": r.day} for r in query])


@exprun_bp.route(f"/{exprun_bp.name}/<id>/data", methods=["GET"])
def fetch_exp_run_data(id: int):
    """Fetch the experiment run data"""
    try:
        exp_run: ExpRun = ExpRun.get_by_id(id)
    except DoesNotExist:
        raise NotFound(f"ExpRun with id {id} does not exist")

    osin = OsinRepository.get_instance()
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
                fields.setdefault(parts[0], set()).add(parts[1])
    else:
        fields = None

    if "sorted_by" in request.args:
        sorted_by = request.args["sorted_by"].replace(".", "/")
        if sorted_by.startswith("-"):
            sorted_by = sorted_by[1:]
            sorted_order = "descending"
        else:
            sorted_order = "ascending"
    else:
        sorted_by = None
        sorted_order = "ascending"

    try:
        exp_run_data, n_examples = format.load_exp_run_data(
            h5file, fields, limit, offset, sorted_by, sorted_order
        )
    except KeyError:
        raise BadRequest(f"The key `{sorted_by}` does not exist to sort by")

    out = exp_run_data.to_dict()
    out["n_examples"] = n_examples
    return jsonify(out)


@exprun_bp.route(f"/{exprun_bp.name}/<id>/upload", methods=["POST"])
def upload_exp_run_data(id: int):
    try:
        exp_run: ExpRun = ExpRun.get_by_id(id)
    except DoesNotExist:
        raise NotFound(f"ExpRun with id {id} does not exist")

    files = {}
    for file_id, file in request.files.items():
        print(file, file and file.filename is not None, get_extension(file.filename))
        if (
            file
            and file.filename is not None
            and ("." + (get_extension(file.filename) or ""))
            in OsinRepository.ALLOWED_EXTENSIONS
        ):
            files[file_id] = file

    if len(files) == 0:
        raise BadRequest(f"No files provided")

    osin = OsinRepository.get_instance()
    rundir = osin.get_exp_run_dir(exp_run.exp, exp_run)
    if not rundir.exists():
        rundir.mkdir(parents=True)

    for file_id, file in files.items():
        filename = secure_filename(file.filename)
        file.save(str(rundir / filename))

    (rundir / "_SUCCESS").touch()

    return jsonify({"status": "success"})
