from flask import Flask, request, jsonify

from osin.db import ExpResult, Job

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
    app.run(host='0.0.0.0', port=5524)