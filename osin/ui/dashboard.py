import os

import streamlit as st
import seaborn as sns
from osin.config import ROOT_DIR, CONFIG_FILE
from osin.db import ExpResult, Job
from osin.exp_config import ExpConfig
from osin.ui.toggle_list import toggle_list
from streamlit.callbacks.callbacks import periodic


containers = {'jobs': None}
exp_data_containers = []
job_container = None


@st.cache(suppress_st_warning=True)
def get_session():
    return {}


def periodic_check():
    """Run periodic check to see if we need to update the data"""
    global exp_data_containers, job_container, containers
    # TODO: check if we have new data, then update it
    if containers['jobs'] is not None:
        with containers['jobs']:
            toggle_list(get_jobs())


def get_jobs():
    jobs = Job.recent_jobs(0, 5)
    return [
        dict(id=job.id,
             name=' '.join(job.exec_run_args),
             icon={"queueing": "hourglass", "success": "circle-check", "started": "spinner",
                   "failure": "triangle-exclaimation"}[job.status],
             value=job.hostname)
        for job in jobs
    ]


# apply general settings
st.set_page_config(layout="wide")
sns.set_theme()
periodic(1.0, periodic_check)


# render experiments
exp_configs = ExpConfig.from_file(CONFIG_FILE)
for exp_config in exp_configs:
    st.markdown(f"# {exp_config.name}")

    report_grids = exp_config.report()
    for row in report_grids:
        col_sizes = [r['colspan'] for r in row]
        if sum(col_sizes) < 24:
            # add a padding column so that streamlit don't auto-scale the columns
            col_sizes.append(24 - sum(col_sizes))

        cols = st.beta_columns(col_sizes)
        for col, report in zip(cols, row):
            with col:
                if report['display_name']:
                    st.markdown(f"### {report['name']}")
                value = report['get_value']()
                st.write(value)

    if st.button("Run experiment"):
        jobs = exp_configs[0].trigger_runs({k: [v[0]] for k, v in exp_configs[0].parameters.items()})
        st.write(f"Start {len(jobs)}.\n" + "\n".join([
            f"{job.hostname}:{job.pid}:{job.logfile}" for job in jobs
        ]))

    st.markdown(f"## Raw Data")
    exp_data_containers.append(st.beta_container())
    with exp_data_containers[-1]:
        st.write(ExpResult.as_dataframe(exp_config.table_name))


st.markdown(f"## Running Jobs")
containers['jobs'] = st.empty()
with containers['jobs']:
    toggle_list(get_jobs())
