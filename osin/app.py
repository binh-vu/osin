import os
from gena import generate_app

from osin.controllers.exp import exp_bp, exprun_bp
from osin.controllers.report import report_bp, expreport_bp
from osin.controllers.views import exprunview_bp

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

app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # maximum upload of 100 MB
