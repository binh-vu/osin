import os, re
from gena import generate_app

from osin.controllers.exp import exp_bp, exprun_bp
from osin.controllers.report import report_bp, expreport_bp
from osin.controllers.views import exprunview_bp
from loguru import logger

app = generate_app(
    [
        exp_bp,
        exprun_bp,
        exprunview_bp,
        report_bp,
        expreport_bp,
    ],
    os.path.dirname(__file__),
    # log_sql_queries=False,
)

if "MAX_UPLOAD_SIZE" in os.environ:
    m = re.match(r"(\d+)MB", os.environ["MAX_UPLOAD_SIZE"])
    assert m is not None, f"MAX_UPLOAD_SIZE must has the following format <X>MB but got {os.environ['MAX_UPLOAD_SIZE']}"
    max_upload_mb = int(m.groups()[0])
else:
    # maximum upload of 100 MB
    max_upload_mb = 100
logger.info(f"Maximum upload size is {max_upload_mb} MB")
app.config["MAX_CONTENT_LENGTH"] = max_upload_mb * 1024 * 1024
