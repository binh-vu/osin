import os
import streamlit as st
from osin.db import Database
from osin.config import DBFILE

db = Database.get_instance(DBFILE)
df = db.to_dataframe()

st.dataframe(df)

# create a report
Report(
    parameters={
    },
    query={},

)