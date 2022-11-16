import { JunctionRecord } from "gena-app";
import { makeObservable, observable } from "mobx";

export class ExpReport implements JunctionRecord<number, number, number> {
  id: number;
  expId: number;
  reportId: number;
  position?: Position;

  public constructor(
    id: number,
    expId: number,
    reportId: number,
    position?: Position
  ) {
    this.id = id;
    this.expId = expId;
    this.reportId = reportId;
    this.position = position;

    makeObservable(this, {
      id: observable,
      expId: observable,
      reportId: observable,
      position: observable,
    });
  }

  get aid() {
    return this.expId;
  }

  get bid() {
    return this.reportId;
  }

  markSaved() {
    return;
  }

  toModel() {
    return this;
  }
}

export interface Position {
  rowOrder: number;
  colSpan: number;
  colOffset: number;
}
