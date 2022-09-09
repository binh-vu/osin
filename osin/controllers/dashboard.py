from gena import generate_api

from osin.models.dashboard import Dashboard

dashboard_bp = generate_api(Dashboard)
