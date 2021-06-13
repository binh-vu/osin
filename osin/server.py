from flask import Flask

app = Flask(__name__)


@app.route("/api/runs", methods=['POST'])
def save_run():
    pass
