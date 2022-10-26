from gena import generate_api
import orjson
from osin.misc import identity

from osin.models.views import ExpRunView

exprunview_bp = generate_api(ExpRunView, deserializers={"config": identity})
