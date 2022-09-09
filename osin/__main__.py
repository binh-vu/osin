import os
from pathlib import Path

import click
from loguru import logger
from peewee import fn
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.wsgi import WSGIContainer
from osin.models import db as dbconn, init_db, Exp, ExpRun, Report, Dashboard


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
def init(db):
    """Init database"""
    init_db(db)
    dbconn.create_tables([Exp, ExpRun, Report, Dashboard], safe=True)


@click.command()
@click.option("-d", "--db", required=True, help="smc database file")
@click.option("--wsgi", is_flag=True, help="Whether to use wsgi server")
@click.option("-p", "--port", default=5524, help="Listening port")
@click.option(
    "--certfile", default=None, help="Path to the certificate signing request"
)
@click.option("--keyfile", default=None, help="Path to the key file")
def start(
    db: str,
    externaldb: str,
    externaldb_proxy: bool,
    wsgi: bool,
    port: int,
    certfile: str,
    keyfile: str,
):
    init_db(db)

    if certfile is None or keyfile is None:
        ssl_options = None
    else:
        ssl_options = {"certfile": certfile, "keyfile": keyfile}
        assert not wsgi

    from osin.app import app

    if wsgi:
        app.run(host="0.0.0.0", port=port)
    else:
        logger.info("Start server in non-wsgi mode")
        http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
        http_server.listen(port)
        IOLoop.instance().start()
