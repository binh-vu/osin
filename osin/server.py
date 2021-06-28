from flask import Flask, request, jsonify
from osin.db import ExpResult, Job
from loguru import logger

app = Flask(__name__)


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


if __name__ == '__main__':
    import click
    from tornado.wsgi import WSGIContainer
    from tornado.httpserver import HTTPServer
    from tornado.ioloop import IOLoop

    @click.command()
    @click.option("--no_wsgi", type=bool, default=False, help="Whether to use non-wsgi server")
    def main(no_wsgi: bool):
        if no_wsgi:
            logger.info("Start osin server in non-wsgi mode")
            http_server = HTTPServer(WSGIContainer(app))
            http_server.listen(5524)
            IOLoop.instance().start()
        else:
            app.run(host='0.0.0.0', port=5524)

    main()

