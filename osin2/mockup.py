"""Mockup experiments
"""
import random
import time

import click
from osin.api import submit


@click.command()
@click.option("--dataset", help="dataset")
@click.option("--method", help="method")
@click.option("--exectime", help="execution time in seconds")
def main(dataset, method, exectime):
    precision = random.randint(70, 100) / 100
    recall = random.randint(70, 100) / 100
    f1 = 2 * precision * recall / (precision + recall)
    k = 10
    for i in range(k):
        print("Training batch", i)
        time.sleep(int(exectime) / k)
    print("Training done!")
    submit({
        "dataset": dataset,
        "method": method,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "exectime": exectime
    })


if __name__ == '__main__':
    main()