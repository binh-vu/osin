import h5py, shutil, numpy as np
from pathlib import Path

tmp_dir = Path(__file__).parent / "tmp"
if tmp_dir.exists():
    shutil.rmtree(tmp_dir)
tmp_dir.mkdir()

a = [
    ["id", "name", "value"],
    [1, "a", 1.0],
    [2, "b", 2.0],
    [3, "c", 3.0],
]
a = np.asarray(a)
print(a)

with h5py.File(tmp_dir / "test.h5", "a") as f:
    grp = f.create_group("individual")
    grp["data"] = a
