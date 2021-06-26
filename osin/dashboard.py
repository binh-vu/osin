import os

import streamlit as st
import seaborn as sns
from osin.config import ROOT_DIR
from osin.db import ExpResult
from osin.exp_config import ExpConfig


@st.cache(suppress_st_warning=True)
def get_session():
    return {}


# apply general settings
st.set_page_config(layout="wide")
sns.set_theme()


# render experiments
exp_configs = ExpConfig.from_file(os.path.join(ROOT_DIR, "experiments.yml"))
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
                    st.markdown(f"## {report['name']}")
                value = report['get_value']()
                st.write(value)

    if st.button("Run experiment"):
        jobs = exp_configs[0].trigger_runs({k: [v[0]] for k, v in exp_configs[0].parameters.items()})
        st.write(f"Start {len(jobs)}.\n" + "\n".join([
            f"{job.hostname}:{job.pid}:{job.logfile}" for job in jobs
        ]))

    st.markdown(f"## Experimental Results")
    st.write(ExpResult.as_dataframe(exp_config.table_name))