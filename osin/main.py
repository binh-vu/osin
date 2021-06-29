import os
import subprocess
import time

import click
from loguru import logger

parent = os.path.dirname(os.path.abspath(__file__))


@click.command()
@click.option("--pid_file", "-p", default="/tmp/osin.pid", help="File contains child processes' id")
@click.option("--grace_period", "-t", default=30, type=int, help="Maximum time waiting to stop the process. Default 30 seconds")
@click.option("--no_wsgi", default="false", help="Whether to use non-wsgi server")
@click.option("--certfile", default=None, help="Path to the certificate signing request")
@click.option("--keyfile", default=None, help="Path to the key file")
def main(pid_file: str, grace_period: int, no_wsgi: str, certfile: str, keyfile: str):
    if os.path.exists(pid_file):
        logger.error("Previous processes are still running. Stop them first!")
        return

    env = dict(os.environ)
    logger.info("Start streamlit...")
    p1 = subprocess.Popen(["streamlit", "run", os.path.join(parent, "ui/dashboard.py")], env=env)
    with open(pid_file, "a") as f:
        f.write(str(p1.pid))
        f.write("\n")

    logger.info("Start worker...")
    p2 = subprocess.Popen(["python", "-m", "osin.worker"], env=env)
    with open(pid_file, "a") as f:
        f.write(str(p2.pid))
        f.write("\n")

    logger.info("Start server...")
    cmd = ["python", "-m", "osin.server", "--no_wsgi", no_wsgi]
    if certfile is not None and keyfile is not None:
        cmd += ["--certfile", certfile, "--keyfile", keyfile]
    p3 = subprocess.Popen(cmd, env=env)
    with open(pid_file, "a") as f:
        f.write(str(p3.pid))
        f.write("\n")

    try:
        p1.wait()
        p2.wait()
        p3.wait()
    except KeyboardInterrupt:
        logger.info("Receive termination signal. Stop the application")
        p1.terminate()
        p2.terminate()
        p3.terminate()

    print("Wait for the application to fully stop", end="", flush=True)
    for i in range(grace_period):
        if any(p.poll() is None for p in [p1, p2, p3]):
            print(".", end="", flush=True)
            time.sleep(1)

    if all(p.returncode is not None for p in [p1, p2, p3]):
        logger.info("Terminate the application successfully! Return code: {}", [p.returncode for p in [p1, p2, p3]])
        os.remove(pid_file)
    else:
        logger.error("We can't fully stop the application")
        print("Return code:", [p.returncode for p in [p1, p2, p3]])


if __name__ == '__main__':
    main()
