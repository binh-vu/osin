from gena import generate_api

from osin.models.exp import Exp, ExpRun

exp_bp = generate_api(Exp)
exp_run_bp = generate_api(ExpRun)
