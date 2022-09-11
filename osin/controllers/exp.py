import orjson
from gena import generate_api
from dateutil.parser import parse

from osin.models.exp import Exp, ExpRun

exp_bp = generate_api(Exp)
exp_run_bp = generate_api(
    ExpRun,
    deserializers={
        "params": orjson.loads,
        "finished_time": parse,
        "created_time": parse,
        "aggregated_outputs": orjson.loads,
    },
)
