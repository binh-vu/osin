import os
import socket

import requests


def submit(data: dict, table: str = 'default', host: str = 'http://localhost:5524'):
    """Submit results to the server"""
    resp = requests.post(host + "/api/v1/runs", json={
        "data": data,
        "table": table,
        "hostname": socket.gethostname(),
        "pid": str(os.getpid())
    })
    assert resp.status_code == 200, resp


def error(host: str = 'http://localhost:5524'):
    """Tell the server that we encounter some errors. This is optional as we monitor for changes"""
    resp = requests.post(host + "/api/v1/runs/error", json={
        "hostname": socket.gethostname(),
        "pid": str(os.getpid())
    })
    assert resp.status_code == 200, resp
