import os
from gena import generate_api, generate_app, generate_readonly_api_4dict

from osin.controllers.dashboard import dashboard_bp
from osin.controllers.exp import exp_bp, exp_run_bp
from osin.controllers.report import report_bp

app = generate_app(
    [
        dashboard_bp,
        report_bp,
        exp_bp,
        exp_run_bp,
    ],
    os.path.dirname(__file__),
)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # maximum upload of 16 MB
