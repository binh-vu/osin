import os
from pathlib import Path
import numpy as np
from sklearn.datasets import load_digits, load_iris
from sklearn.metrics import classification_report
from sklearn.svm import SVC
from osin.apis import Osin
from osin.types import OTable
from osin.graph.params_parser import ParamsParser
from dataclasses import dataclass
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import make_moons, make_circles, make_classification
from sklearn.neural_network import MLPClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis
from sklearn.inspection import DecisionBoundaryDisplay


@dataclass
class Args:
    dataset: str
    method: str


args = ParamParser(Args).parse_args()

osin = Osin.local(
    osin_dir=Path(os.path.abspath(__file__)).parent.parent.parent / "data"
)
exp = osin.init_exp(
    name="sklearn.classification",
    version=1,
    description="Testing sklearn classifiers on some sklearn datasets",
    params=args,
)
exp_run = osin.new_exp_run(exp, args)

if args.dataset == "iris":
    X, y = load_iris(return_X_y=True)
elif args.dataset == "digits":
    X, y = load_digits(return_X_y=True)
else:
    raise NotImplementedError()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.4, random_state=42
)

classifiers = {
    "Nearest Neighbors": KNeighborsClassifier(3),
    "Linear SVM": SVC(kernel="linear", C=0.025),
    "RBF SVM": SVC(gamma=2, C=1),  # type: ignore
    "Gaussian Process": GaussianProcessClassifier(1.0 * RBF(1.0)),
    "Decision Tree": DecisionTreeClassifier(max_depth=5),
    "Random Forest": RandomForestClassifier(
        max_depth=5, n_estimators=10, max_features=1  # type: ignore
    ),
    "Neural Net": MLPClassifier(alpha=1, max_iter=1000),
    "AdaBoost": AdaBoostClassifier(),
    "Naive Bayes": GaussianNB(),
    "QDA": QuadraticDiscriminantAnalysis(),
}

scaler = StandardScaler().fit(X_train)
X_train = scaler.transform(X_train)
X_test = scaler.transform(X_test)

clf = classifiers[args.method]
clf.fit(X_train, y_train)

ytrainpred = clf.predict(X_train)
ytestpred = clf.predict(X_test)

for i in range(len(y_test)):
    osin.update_example_output(
        exp_run,
        example_id=f"test:{i}",
        primitive={
            "label": int(y_test[i]),
            "prediction": int(ytestpred[i]),
            "correct": y_test[i] == ytestpred[i],
        },
        complex={
            "features": OTable(
                rows=[{
                    **{
                        f"feature_{j}": val for j, val in enumerate(X_test[i].tolist()))
                    },
                    "label": int(y_test[i]),
                    "prediction": int(ytestpred[i]),
                }]
            )
        },
    )

res = classification_report(y_train, ytrainpred, output_dict=True)
assert isinstance(res, dict)
osin.update_exp_run_output(
    exp_run=exp_run,
    primitive=res,
)
res = classification_report(y_test, ytestpred, output_dict=True)
assert isinstance(res, dict)
osin.update_exp_run_output(
    exp_run=exp_run,
    primitive=res,
)

osin.finish_exp_run(exp_run)
