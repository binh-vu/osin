import argparse
import os
import socket
import subprocess
import time
from uuid import uuid4
from loguru import logger
from osin.db import Job, db


class JobExecutor:
    def __init__(self, check_interval: int = 1):
        # find the last finished job
        self.check_interval = check_interval

        self.last_job_id = Job.last_finished_job()
        self.bash_argparser = argparse.ArgumentParser(description="Run bash command")
        self.bash_argparser.add_argument("--cwd", help="Working directory")

    def start(self):
        """Start a daemon monitoring the database for new jobs to run"""
        logger.info("Worker started!")
        printed_wait_msg = False
        while True:
            # find new jobs
            jobs = list(Job.select().where(Job.id > self.last_job_id))
            if len(jobs) > 0:
                logger.info("Found {} jobs", len(jobs))
                printed_wait_msg = False
            else:
                if not printed_wait_msg:
                    logger.info("Waiting for jobs...")
                    printed_wait_msg = True
            for job in jobs:
                if job.exec_type == "bash":
                    logger.info("Execute job: {}", job.id)
                    tracker = self.bash(job)
                    self.wait_till_finish(tracker)
                    self.last_job_id = job.id

                    with db.atomic():
                        new_job = Job.get_by_id(job.id)
                        assert new_job.status != "queueing"
                        if new_job.status == "started":
                            # this job has failed to report to the server, so we mark it as failed
                            new_job.status = "failure"
                            new_job.save()
                    logger.info("Execute job: {}. Done!", job.id)
                else:
                    raise NotImplementedError(job.exec_type)

            # rest before checking again
            time.sleep(self.check_interval)

    def bash(self, job: Job) -> subprocess.Popen:
        """Run program in bash and save the job to db"""
        bash_args = self.bash_argparser.parse_args(job.exec_init_args)
        logfile = f"/tmp/{str(uuid4())}.log"
        with open(logfile, "w") as f:
            p = subprocess.Popen(job.exec_run_args, cwd=bash_args.cwd,
                                 stdout=f, stderr=f,
                                 start_new_session=True, env=dict(os.environ))
        job.hostname = socket.gethostname()
        job.pid = str(p.pid)
        job.status = "started"
        job.save()
        return p

    def wait_till_finish(self, p: subprocess.Popen):
        p.wait()


if __name__ == '__main__':
    JobExecutor().start()
