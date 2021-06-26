FROM continuumio/anaconda3:2021.05

ADD . /osin

WORKDIR /osin

RUN pip install poetry
RUN poetry install
