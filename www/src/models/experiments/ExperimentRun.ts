import { action, computed, makeObservable, observable } from "mobx";
import { Record } from "gena-app";
import {
  NestedPrimitiveData,
  ExperimentRunData,
  ExpRunDataTracker,
} from "./ExperimentRunData";
export interface Metadata {
  hostname: string;
  n_cpus: number;
  memory_usage: number;
}

export class ExperimentRun implements Record<number> {
  id: number;
  exp: number;
  isDeleted: boolean;
  isFinished: boolean;
  isSuccessful: boolean;
  createdTime: Date;
  finishedTime: Date;
  params: NestedPrimitiveData;
  metadata: Metadata;
  data: ExperimentRunData;
  dataTracker: ExpRunDataTracker;

  public constructor(
    id: number,
    exp: number,
    isDeleted: boolean,
    isFinished: boolean,
    isFailed: boolean,
    createdTime: Date,
    finishedTime: Date,
    params: NestedPrimitiveData,
    metadata: Metadata,
    data: ExperimentRunData,
    dataTracker: ExpRunDataTracker
  ) {
    this.id = id;
    this.exp = exp;
    this.isDeleted = isDeleted;
    this.isFinished = isFinished;
    this.isSuccessful = isFailed;
    this.createdTime = createdTime;
    this.finishedTime = finishedTime;
    this.params = params;
    this.metadata = metadata;
    this.data = data;
    this.dataTracker = dataTracker;

    makeObservable(this, {
      id: observable,
      exp: observable,
      isDeleted: observable,
      isFinished: observable,
      isSuccessful: observable,
      createdTime: observable,
      finishedTime: observable,
      params: observable,
      metadata: observable,
      data: observable,
      dataTracker: observable,
    });
  }
}
