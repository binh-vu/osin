import { action, computed, makeObservable, observable } from "mobx";
import { Record } from "gena-app";

export class ExperimentRun implements Record<number> {
  id: number;
  exp: number;
  isDeleted: boolean;
  isFinished: boolean;
  createdTime: Date;
  finishedTime: Date;
  aggregatedOutputs: { [key: string]: string | number | boolean };

  public constructor(
    id: number,
    exp: number,
    isDeleted: boolean,
    isFinished: boolean,
    createdTime: Date,
    finishedTime: Date,
    aggregatedOutputs: { [key: string]: string | number | boolean }
  ) {
    this.id = id;
    this.exp = exp;
    this.isDeleted = isDeleted;
    this.isFinished = isFinished;
    this.createdTime = createdTime;
    this.finishedTime = finishedTime;
    this.aggregatedOutputs = aggregatedOutputs;

    makeObservable(this, {
      id: observable,
      exp: observable,
      isDeleted: observable,
      isFinished: observable,
      createdTime: observable,
      finishedTime: observable,
      aggregatedOutputs: observable,
    });
  }
}
