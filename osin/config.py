import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = str(Path(os.path.abspath(__file__)).parent.parent)

if 'DBFILE' not in os.environ:
    import warnings
    warnings.warn(
        "Environment variables are not specified! Manually load from `.env` file"
    )
    envfile = os.path.join(ROOT_DIR, ".env")
    load_dotenv(envfile)

DBFILE = os.environ['DBFILE']
if DBFILE.startswith("."):
    # relative path, we need to join between the current one
    DBFILE = os.path.abspath(os.path.join(ROOT_DIR, DBFILE))
else:
    DBFILE = os.path.abspath(DBFILE)

CONFIG_FILE = os.environ.get('CONFIG', os.path.join(ROOT_DIR, "experiments.yml"))
