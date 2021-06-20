import os

import streamlit as st

from osin.config import ROOT_DIR
from osin.db import ExpResult
from osin.exp_config import ExpConfig


@st.cache(suppress_st_warning=True)
def get_session():
    return {}


st.set_page_config(layout="wide")

exp_configs = ExpConfig.from_file(os.path.join(ROOT_DIR, "experiments.yml"))
for exp_config in exp_configs:
    st.markdown(f"# {exp_config.name}")

    reports = exp_config.report()
    for report in reports:
        st.markdown(f"## {report['name']}")
        st.write(report['value'])

    if st.button("Run experiment"):
        jobs = exp_configs[0].trigger_runs({k: [v[0]] for k, v in exp_configs[0].parameters.items()})
        st.write(f"Start {len(jobs)}.\n" + "\n".join([
            f"{job.hostname}:{job.pid}:{job.logfile}" for job in jobs
        ]))

    st.markdown(f"Experiment data")
    st.write(ExpResult.as_dataframe(exp_config.table_name))