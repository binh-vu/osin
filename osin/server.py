import os
from typing import Dict, List

from flask import Flask, request, jsonify, render_template
from peewee import DoesNotExist

from osin.config import ROOT_DIR
from osin.db import ExpResult, Job, db, ExpTableSchema
from loguru import logger


app = Flask(__name__, template_folder=os.path.join(ROOT_DIR, "osin/ui/www/build"), static_folder=os.path.join(ROOT_DIR, "osin/ui/www/build/static"), static_url_path='/static')
app.config['JSON_SORT_KEYS'] = False


@app.route("/", defaults={'_path': ''})
@app.route('/<path:_path>')
def home(_path):
    return render_template("index.html")


@app.route("/api/v1/runs", methods=['POST'])
def save_run():
    table = request.json['table']
    data = request.json['data']

    with db:
        ExpResult.create(table=table, data=data)
        try:
            schema = ExpTableSchema.get_table(table)
        except DoesNotExist:
            schema = ExpTableSchema(table=table)
        schema.add_exp_result(data)
        schema.save()

        jobs = Job.select().where(Job.hostname == request.json['hostname'], Job.pid == str(request.json['pid']))
        jobs = list(jobs)
        if len(jobs) > 0:
            # ignore when users submit an orphan job, mark the job that we finished
            assert len(jobs) == 1, "We have multiple jobs of samse hostname and process id. This shouldn't happen"
            jobs[0].status = "success"
            jobs[0].save()

    return jsonify({"status": "success"}), 200


@app.route("/api/v1/runs/error", methods=['POST'])
def run_error():
    jobs = Job.select().where(
        Job.hostname == request.json['hostname'], Job.pid == str(request.json['pid']))
    jobs = list(jobs)
    if len(jobs) > 0:
        # ignore when users submit an orphan job, mark the job that we finished
        assert len(jobs) == 1, "We have multiple jobs of same hostname and process id. This shouldn't happen"
        jobs[0].status = "failure"
        jobs[0].save()
    return jsonify({"status": "success"}), 200


@app.route("/api/v1/runs", methods=["GET"])
def get_data():
    if "table" not in request.args:
        return jsonify({"status": "missing table name"}), 400
    try:
        if 'limit' in request.args:
            assert request.args['limit'].isdigit()
        if 'offset' in request.args:
            assert request.args['offset'].isdigit()
    except AssertionError:
        return jsonify({"status": "bad query"}), 400

    condition = ExpResult.table == request.args['table']
    not_include_deleted = request.args.get('include_deleted', 'false').lower() != 'true'
    if not_include_deleted:
        condition = condition & (ExpResult.is_deleted == False)

    query = ExpResult.select().where(condition)
    if 'limit' in request.args:
        query = query.limit(int(request.args['limit']))
    if 'offset' in request.args:
        query = query.offset(int(request.args['offset']))
    if request.args.get('order', None) == 'desc':
        query = query.order_by(ExpResult.id.desc())

    records = []
    for r in query:
        record = dict(id=r.id, created_time=r.created_time, **r.data)
        if not not_include_deleted:
            record['deleted'] = 1 if r.is_deleted else None
        records.append(record)

    total = ExpResult.select().where(ExpResult.table == request.args['table']).count()
    return jsonify({"records": records, "total": total}), 200


@app.route("/api/v1/runs/delete", methods=['POST'])
def delete_runs():
    run_ids = request.json['run_ids']
    if request.json.get('is_permanent', False):
        with db:
            # load previous exps to update the schema
            exp_results: List[ExpResult] = list(ExpResult.select().where(ExpResult.id.in_(run_ids)))
            tables: Dict[str, ExpTableSchema] = {r.table: None for r in exp_results}
            for table in tables:
                tables[table] = ExpTableSchema.get_table(table)
            for r in exp_results:
                tables[r.table].remove_exp_result(r.data)
            for table in tables.values():
                table.save()
            ExpResult.delete().where(ExpResult.id.in_(run_ids)).execute()
    else:
        ExpResult.update(is_deleted=True).where(ExpResult.id.in_(run_ids)).execute()
    return jsonify({"status": "success"}), 200


@app.route("/api/v1/runs/restore", methods=['POST'])
def restore_runs():
    run_ids = request.json['run_ids']
    ExpResult.update(is_deleted=False).where(ExpResult.id.in_(run_ids)).execute()
    return jsonify({"status": "success"}), 200


@app.route("/api/v1/tables/<table>", methods=["GET"])
def get_table(table):
    try:
        schema = ExpTableSchema.get_table(table)
    except DoesNotExist:
        return jsonify({"status": "error", "message": "table doesn't exist"}), 400
    return jsonify(schema.to_dict())


@app.route("/api/v1/tables/<table>", methods=["POST"])
def update_table(table):
    try:
        schema = ExpTableSchema.get_table(table)
    except DoesNotExist:
        return jsonify({"status": "error", "message": "table doesn't exist"}), 400

    for name, raw_col in request.json['columns'].items():
        if name in schema.columns:
            col = schema.columns[name]
            for k in ['visibility', 'type', 'format']:
                if k in raw_col:
                    setattr(col, k, raw_col[k])

    schema.save()
    return jsonify({"status": "success"})


if __name__ == '__main__':
    import click
    from tornado.wsgi import WSGIContainer
    from tornado.httpserver import HTTPServer
    from tornado.ioloop import IOLoop

    @click.command()
    @click.option("--no_wsgi", type=bool, default=False, help="Whether to use non-wsgi server")
    @click.option("--certfile", default=None, help="Path to the certificate signing request")
    @click.option("--keyfile", default=None, help="Path to the key file")
    def main(no_wsgi: bool, certfile: str, keyfile: str):
        if certfile is None or keyfile is None:
            ssl_options = None
        else:
            ssl_options = {
                'certfile': certfile,
                'keyfile': keyfile
            }
            assert no_wsgi

        if no_wsgi:
            logger.info("Start osin server in non-wsgi mode")
            http_server = HTTPServer(WSGIContainer(app), ssl_options=ssl_options)
            http_server.listen(5524)
            IOLoop.instance().start()
        else:
            app.run(host='0.0.0.0', port=5524)

    main()

