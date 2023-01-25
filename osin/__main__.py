import os
from pathlib import Path

import click
from loguru import logger
import orjson
from osin.misc import orjson_dumps
from osin.params_helper import ParamComparison
from peewee import fn
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.wsgi import WSGIContainer
from osin.models import db as dbconn, init_db, all_tables, ExpRun
from osin.repository import OsinRepository


@click.command()
@click.option("-d", "--data", required=True, help="data directory of osin")
def init(data):
    """Init database"""
    init_db(OsinRepository.get_instance(data).get_db_file())
    dbconn.create_tables(all_tables, safe=True)


@click.command()
@click.option("-d", "--data", required=True, help="data directory of osin")
@click.option("--wsgi", is_flag=True, help="Whether to use wsgi server")
@click.option("-p", "--port", default=5524, help="Listening port")
@click.option(
    "--certfile", default=None, help="Path to the certificate signing request"
)
@click.option("--keyfile", default=None, help="Path to the key file")
def start(
    data: str,
    wsgi: bool,
    port: int,
    certfile: str,
    keyfile: str,
):
    init_db(OsinRepository.get_instance(data).get_db_file())

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


@click.command(name="run-compare")
@click.option("-d", "--data", required=True, help="data directory of osin")
@click.argument("runs", nargs=2, type=int)
def compare_run_parameters(data: str, runs: list[int]):
    init_db(OsinRepository.get_instance(data).get_db_file())
    expruns: list[ExpRun] = list(ExpRun.select().where(ExpRun.id.in_(runs)))

    cmp_res = ParamComparison.compare_params(
        expruns[0].id, expruns[0].params, expruns[1].id, expruns[1].params
    )
    if cmp_res is None:
        print("No difference between parameters of the two runs")
    else:
        print(
            orjson_dumps(
                cmp_res,
                option=orjson.OPT_INDENT_2
                | orjson.OPT_SORT_KEYS
                | orjson.OPT_NON_STR_KEYS,
            ).decode()
        )


@click.group()
def cli():
    pass


cli.add_command(init)
cli.add_command(start)
cli.add_command(compare_run_parameters)


if __name__ == "__main__":
    cli()
