import { makeObservable, observable } from "mobx";
import { Record } from "gena-app";
import { ColumnConfig } from "components/table/Columns";

export interface ExpRunViewConfig {
  columns: ColumnConfig[];
}

export class ExpRunView implements Record<number> {
  id: number;
  exp: number;
  config: ExpRunViewConfig;

  public constructor(id: number, exp: number, config: ExpRunViewConfig) {
    this.id = id;
    this.exp = exp;
    this.config = config;

    makeObservable(this, {
      id: observable,
      exp: observable,
      config: observable,
    });
  }
}
