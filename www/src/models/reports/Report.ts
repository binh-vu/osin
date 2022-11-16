import { Record } from "gena-app";
import { makeObservable, observable } from "mobx";

export type IndexProperty = "params" | "aggregated_primitive_outputs";
export const COLUMN_MAX_SIZE = 24;
export const EXPNAME_INDEX_FIELD = "__exp__";
export type EXPNAME_INDEX_FIELD_TYPE = "__exp__";
export type IndexValue = string | number | boolean | null;

export class Index {
  index: string[];
  values: null | IndexValue[];
  property: IndexProperty;

  public constructor(
    index: string[],
    values: null | IndexValue[],
    property: IndexProperty
  ) {
    this.index = index;
    this.values = values;
    this.property = property;

    makeObservable(this, {
      index: observable,
      values: observable,
      property: observable,
    });
  }
}

export class ExpIndex {
  indices: { [expId: number]: Index | EXPNAME_INDEX_FIELD_TYPE };
  // null when the indices are all EXPNAME_INDEX_FIELD
  // since there is no values, and the list of experiments are provided
  // by indices
  values: null | { [expId: number]: IndexValue[] };

  public constructor(
    indices: { [expId: number]: Index | EXPNAME_INDEX_FIELD_TYPE },
    values: null | { [expId: number]: IndexValue[] }
  ) {
    this.indices = indices;
    this.values = values;

    makeObservable(this, {
      indices: observable,
      values: observable,
    });
  }
}

export class Axis {
  indices: (Index | ExpIndex)[];

  public constructor(indices: (Index | ExpIndex)[]) {
    this.indices = indices;

    makeObservable(this, {
      indices: observable,
    });
  }
}

export class ReportTableArgs {
  type: "table";
  value: {
    xaxis: Axis;
    yaxis: Axis;
    zvalues: (Index | ExpIndex)[];
  };

  public constructor(
    type: "table",
    value: {
      xaxis: Axis;
      yaxis: Axis;
      zvalues: (Index | ExpIndex)[];
    }
  ) {
    this.type = type;
    this.value = value;

    makeObservable(this, {
      type: observable,
      value: observable,
    });
  }
}

export class Report implements Record<number> {
  id: number;
  name: string;
  description: string;
  args: ReportTableArgs;

  public constructor(
    id: number,
    name: string,
    description: string,
    args: ReportTableArgs
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.args = args;

    makeObservable(this, {
      id: observable,
      name: observable,
      description: observable,
      args: observable,
    });
  }
}
