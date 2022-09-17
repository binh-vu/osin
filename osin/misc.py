import sys
from typing import Dict
from osin.types import NestedPrimitiveOutput, PyObject
from h5py import Group


def get_caller_python_script():
    """Determine the python script that starts the python program"""
    return sys.argv[0]


def h5_update_nested_primitive_object(
    group: Group, primitive_object: NestedPrimitiveOutput
):
    for key, value in primitive_object.items():
        if isinstance(value, dict):
            subgroup = group.create_group(key)
            h5_update_nested_primitive_object(subgroup, value)
        else:
            group[key] = value
