from typing import Dict, List

from playhouse.migrate import *
from osin.db import db, ExpResult, ExpTableSchema


def migrate_to_v2():
    """
    * Add ExpResult.is_deleted column
    * Index ExpResult.table column
    """
    migrator = SqliteMigrator(db)
    table_name = ExpResult._meta.table.__name__

    with db.atomic():
        migrate(
            migrator.add_column(table_name, 'is_deleted', BooleanField(default=False, index=True)),
            migrator.add_index(table_name, ('table',), False)
        )


def migrate_to_v3():
    with db.atomic():
        db.create_tables([ExpTableSchema])
        exps: List[ExpResult] = list(ExpResult.select())
        tables: Dict[str, ExpTableSchema] = {r.table: ExpTableSchema(table=r.table) for r in exps}
        for exp in exps:
            tables[exp.table].add_exp_result(exp.data)
        for tbl in tables.values():
            tbl.save()


if __name__ == '__main__':
    migrate_to_v3()
