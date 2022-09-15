import pytest
from osin.models.base import db, init_db, is_inited
from osin.models import all_tables


@pytest.fixture
def clean_db():
    global db, is_inited, init_db

    try:
        assert is_inited is False
        init_db(":memory:")
        db.create_tables(all_tables, safe=False)
        yield db
    finally:
        db.drop_tables(all_tables)
        db.close()
        is_inited = False
