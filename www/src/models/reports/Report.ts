import { Record } from "gena-app";
import { makeObservable, observable } from "mobx";

export type IndexProperty = "params" | "aggregated_primitive_outputs";
export const COLUMN_MAX_SIZE = 24;
export const EXPNAME_INDEX_FIELD = "__exp__";
export type EXPNAME_INDEX_FIELD_TYPE = "__exp__";
export type IndexValue = string | number | boolean | null;

export class Attribute {
  path: string[];

  constructor(path: string[]) {
    this.path = path;
  }

  getLabel(): string {
    return this.path.length > 1 ? this.path.slice(1).join(".") : this.path[0];
  }
}

export class AttrGetter {
  attr: Attribute;
  values: IndexValue[];

  public constructor(attr: Attribute, values: IndexValue[]) {
    this.attr = attr;
    this.values = values;

    makeObservable(this, {
      attr: observable,
      values: observable,
    });
  }
}

export class IndexSchema {
  attrs: AttrGetter[];
  index2children: number[][];
  fullyObserverdAttrs: number[][];

  public constructor(
    attrs: AttrGetter[],
    index2children: number[][],
    fullyObserverdAttrs: number[][]
  ) {
    this.attrs = attrs;
    this.index2children = index2children;
    this.fullyObserverdAttrs = fullyObserverdAttrs;

    makeObservable(this, {
      attrs: observable,
      index2children: observable,
      fullyObserverdAttrs: observable,
    });
  }
}

export class ReportTableArgs {
  type: "table";
  value: {
    xaxis: IndexSchema;
    yaxis: IndexSchema;
    zvalues: AttrGetter[];
  };

  public constructor(
    type: "table",
    value: {
      xaxis: IndexSchema;
      yaxis: IndexSchema;
      zvalues: AttrGetter[];
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
