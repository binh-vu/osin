import { Attribute, AttrValue } from "components/reports";
import { DraftUpdateRecord, Record } from "gena-app";
import { ArrayHelper } from "misc/ArrayUtils";
import { action, computed, makeObservable, observable, toJS } from "mobx";
import { Position } from "./ExpReport";

export type IndexProperty = "params" | "aggregated_primitive_outputs";
export const COLUMN_MAX_SIZE = 24;
export const EXPNAME_INDEX_FIELD = "__exp__";
export const ATTRNAME_PARAMS = "params";
export const ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS =
  "aggregated_primitive_outputs";
export type EXPNAME_INDEX_FIELD_TYPE = "__exp__";

export class AttrGetter {
  attr: Attribute;
  values: AttrValue[] | undefined;

  public constructor(attr: Attribute, values: AttrValue[] | undefined) {
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
      roots: computed,
      index2parent: computed,
      addAttrGetter: action,
      addChildAttrGetter: action,
      removeAttrGetter: action,
    });
  }

  static empty(): IndexSchema {
    return new IndexSchema([], [], []);
  }

  get roots(): number[] {
    const inDegrees = ArrayHelper.zeros(this.index2children.length);
    for (let i = 0; i < this.index2children.length; i++) {
      for (const child of this.index2children[i]) {
        inDegrees[child]++;
      }
    }

    const roots = [];
    for (let i = 0; i < inDegrees.length; i++) {
      if (inDegrees[i] === 0) {
        roots.push(i);
      }
    }
    return roots;
  }

  get index2parent(): number[][] {
    const index2parent: number[][] = [];
    for (let i = 0; i < this.index2children.length; i++) {
      index2parent.push([]);
    }
    for (let i = 0; i < this.index2children.length; i++) {
      for (const child of this.index2children[i]) {
        index2parent[child].push(i);
      }
    }
    return index2parent;
  }

  addAttrGetter(attr: AttrGetter, siblingAttrIndex?: number): void {
    // when the sibling is a root, parentAttrIndex is undefined, and we add the new attr as a root
    const parentAttrIndex =
      siblingAttrIndex === undefined
        ? undefined
        : this.index2parent[siblingAttrIndex][0];
    this.addChildAttrGetter(attr, parentAttrIndex);
  }

  addChildAttrGetter(attr: AttrGetter, parentAttrIndex?: number): void {
    this.attrs.push(attr);
    this.index2children.push([]);
    if (
      parentAttrIndex !== undefined &&
      parentAttrIndex >= 0 &&
      parentAttrIndex < this.index2children.length
    ) {
      this.index2children[parentAttrIndex].push(this.attrs.length - 1);
    }
  }

  removeAttrGetter(idx: number) {
    const n = this.attrs.length;
    for (let i = 0; i < n; i++) {
      this.index2children[i] = this.index2children[i]
        .filter((childIdx) => childIdx !== idx)
        .map((x) => (x > idx ? x - 1 : x));
    }
    this.index2children.splice(idx, 1);
    this.attrs.splice(idx, 1);
  }

  getTreeSize(idx: number): number {
    return (
      1 +
      this.index2children[idx]
        .map((x) => this.getTreeSize(x))
        .reduce((a, b) => a + b, 0)
    );
  }
}

export class BaseReport {
  xaxis: IndexSchema;
  yaxis: IndexSchema;
  zvalues: [number | null, AttrGetter[]][];

  public constructor(
    xaxis: IndexSchema,
    yaxis: IndexSchema,
    zvalues: [number | null, AttrGetter[]][]
  ) {
    this.xaxis = xaxis;
    this.yaxis = yaxis;
    this.zvalues = zvalues;

    makeObservable(this, {
      xaxis: observable,
      yaxis: observable,
      zvalues: observable,
      nZValues: computed,
    });
  }

  get nZValues(): number {
    return this.zvalues.map((x) => x[1].length).reduce((a, b) => a + b, 0);
  }
}

export class ReportTableArgs {
  type: "table";
  value: BaseReport;

  public constructor(type: "table", value: BaseReport) {
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

export class DraftUpdateReport
  extends Report
  implements DraftUpdateRecord<number, Report>
{
  exp: number;
  exps: number[];
  position: Position;

  public constructor(
    id: number,
    name: string,
    description: string,
    args: ReportTableArgs,
    exp: number,
    exps: number[],
    position: Position
  ) {
    super(id, name, description, args);

    this.exp = exp;
    this.exps = exps;
    this.position = position;

    makeObservable(this, {
      exp: observable,
      exps: observable,
      position: observable,
    });
  }

  markSaved(): void {}

  toModel(): Report | undefined {
    return undefined;
  }
}
