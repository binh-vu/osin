import os
from gena import generate_api, generate_app, generate_readonly_api_4dict

from osin.controllers.dashboard import dashboard_bp
from osin.controllers.exp import exp_bp, exprun_bp
from osin.controllers.report import report_bp
from osin.controllers.views import exprunview_bp

app = generate_app(
    [
        dashboard_bp,
        report_bp,
        exp_bp,
        exprun_bp,
        exprunview_bp,
    ],
    os.path.dirname(__file__),
    log_sql_queries=False,
)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # maximum upload of 16 MB
