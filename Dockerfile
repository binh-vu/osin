FROM quay.io/pypa/manylinux2014_x86_64:latest

RUN /opt/python/cp310-cp310/bin/pip install poetry && ln -s /opt/python/cp310-cp310/bin/poetry /usr/local/bin

WORKDIR /osin
ADD pyproject.toml poetry.lock /osin/

RUN poetry env use /opt/python/cp310-cp310/bin/python && \
    poetry install
