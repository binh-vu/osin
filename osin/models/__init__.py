from osin.models.base import db, init_db
from osin.models.exp import Exp, ExpRun
from osin.models.report import Report
from osin.models.dashboard import Dashboard
from osin.models.exp_data import ExpRunData, Record, ExampleData
from osin.models.views import ExpRunView

all_tables = [Exp, ExpRun, Report, Dashboard, ExpRunView]
