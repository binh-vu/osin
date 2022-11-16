#!/bin/bash

set -e

datasets=( "iris" "digits" )
classifiers=( 'Nearest Neighbors' 'Linear SVM' 'RBF SVM' 'Decision Tree' 'Random Forest' 'Neural Net' 'AdaBoost' 'Naive Bayes' 'QDA' )

for classifier in "${classifiers[@]}"
do
    for dataset in "${datasets[@]}"
    do
        echo "Running $classifier on $dataset"
        python examples/classification/main.py --dataset $dataset --method "$classifier"
    done
done