from playhouse.migrate import *
from osin.db import db, ExpResult


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


if __name__ == '__main__':
    migrate_to_v2()