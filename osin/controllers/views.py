from gena import generate_api
import orjson

from osin.models.views import ExpRunView

exprunview_bp = generate_api(ExpRunView, deserializers={"config": lambda x: x})
