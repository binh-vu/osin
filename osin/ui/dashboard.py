import math
from operator import attrgetter

import seaborn as sns
import streamlit as st
from streamlit.callbacks.callbacks import periodic

from osin.config import CONFIG_FILE
from osin.db import ExpResult, Job, db
from osin.exp_config import ExpConfig
from osin.ui.toggle_list import toggle_list

# apply general settings
st.set_page_config(layout="wide")
sns.set_theme()
containers = {'jobs': None, 'exps': []}


@st.cache(suppress_st_warning=True, allow_output_mutation=True)
def get_session():
    return {}


session = get_session()


class Dashboard:

    @staticmethod
    def update():
        Dashboard.render_running_jobs()

    @staticmethod
    def render_running_jobs(force: bool = False):
        global containers, session
        if containers['jobs'] is None:
            return

        with containers['jobs']:
            should_rerun = True

            with db.atomic():
                last_finished_job_id = Job.last_finished_job()
                # get the next job
                next_jobs = list(Job.select(Job.id, Job.status).where(Job.id == last_finished_job_id + 1))
                if len(next_jobs) == 0:
                    # key will be the latest job
                    key = f"{last_finished_job_id}:finished"
                else:
                    # key would be the next job & status
                    # when the job is finish or has status updated, this key will change
                    key = f"{next_jobs[0].id}:{next_jobs[0].status}"

                if not force and session.get("render_running_jobs_key", None) == key:
                    should_rerun = False

                if should_rerun:
                    # retrieve the jobs
                    start = max(last_finished_job_id - 3, 0)
                    end = last_finished_job_id + 5
                    jobs = Job.select().where((Job.id >= start) & (Job.id < end))
                    jobs = [
                        dict(id=job.id,
                             name=' '.join(job.exec_run_args),
                             icon={"queueing": "hourglass", "success": "circle-check", "started": "spinner",
                                   "failure": "triangle-exclaimation"}[job.status],
                             value=job.hostname)
                        for job in sorted(list(jobs), key=attrgetter('id'), reverse=True)
                    ]

            if should_rerun:
                with containers['jobs']:
                    session['render_running_jobs_key'] = key
                    toggle_list(jobs)


# periodically check if data has been updated
# TODO: uncomment to re-run job monitoring
# periodic(1.0, Dashboard.update)

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

    with st.form(key='run exp'):
        # create a grid
        n_cols = 3
        n_rows = math.ceil(len(exp_config.parameters) / n_cols)
        params = list(exp_config.parameters.items())
        idx = 0
        selected_params = {}
        for i in range(n_rows):
            cols = st.beta_columns(n_cols)
            for col in cols:
                with col:
                    k, v = params[idx]
                    selected_params[k] = st.multiselect(label=k, options=v)
                    idx += 1

                    if idx >= len(params):
                        break
        run_exp = st.form_submit_button(label='Run experiment')

    if run_exp:
        missing_params = [k for k, v in selected_params.items() if len(v) == 0]
        if len(missing_params) > 0:
            st.error(f"Missing values for parameter: {missing_params}")
        else:
            jobs = exp_configs[0].trigger_runs(selected_params)
            st.write(f"Start {len(jobs)} jobs.\n")

    # st.markdown(f"## Raw Data")
    # containers['exps'].append(st.beta_container())
    # with containers['exps'][-1]:
    #     st.write(ExpResult.as_dataframe(exp_config.table_name))

st.markdown(f"## Running Jobs")
containers['jobs'] = st.empty()
Dashboard.render_running_jobs(force=True)
