import os

from flask import Flask, request, jsonify, render_template

from osin.config import ROOT_DIR
from osin.db import ExpResult, Job
from loguru import logger


app = Flask(__name__, template_folder=os.path.join(ROOT_DIR, "osin/ui/www/build"), static_folder=os.path.join(ROOT_DIR, "osin/ui/www/build/static"), static_url_path='/static')


@app.route("/")
def home():
    return "The server is live"


@app.route("/exps/<table>", methods=['GET'])
def view_table(table: str):
    return render_template('index.html')


@app.route("/api/v1/runs", methods=['POST'])
def save_run():
    ExpResult.create(table=request.json['table'], data=request.json['data'])
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
    columns = []
    if len(records) > 0:
        columns = list(records[0].keys())
    return jsonify({"records": records, "columns": columns}), 200


@app.route("/api/v1/runs/<run_id>", methods=['DELETE'])
def delete_run(run_id: str):
    if not run_id.isdigit():
        return jsonify({"msg": "invalid run id"}), 400

    try:
        exp = ExpResult.get_by_id(int(run_id))
    except:
        return jsonify({"msg": "run id doesn't exist"}), 400
    exp.is_deleted = True
    exp.save()
    return jsonify({"status": "success"}), 200


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

