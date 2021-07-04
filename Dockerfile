FROM continuumio/anaconda3:2021.05

WORKDIR /osin

RUN pip install osin>=0.2.4
