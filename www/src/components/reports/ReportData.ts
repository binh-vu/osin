import { BaseReport } from "models/reports";

export type AttrValue = string | number | boolean | null;

export class Attribute {
  readonly path: ReadonlyArray<string>;
  private value: string;

  constructor(path: string[], value?: string) {
    this.path = path;
    this.value = value || path.join(".");
  }

  asString(): string {
    return this.value;
  }

  static fromString(str: string): Attribute {
    return new Attribute(str.split("."));
  }

  prepend(name: string) {
    this.value = this.path.length > 0 ? name + "." + this.value : name;
    (this.path as string[]).splice(0, 0, name);
    return this;
  }

  append(name: string) {
    this.value = this.path.length > 0 ? this.value + "." + name : name;
    (this.path as string[]).push(name);
    return this;
  }

  getLabel(): string {
    return this.path.length > 1 ? this.path.slice(1).join(".") : this.path[0];
  }

  clone(): Attribute {
    return new Attribute(this.path.slice(), this.value);
  }

  isChildOf(attr: Attribute): boolean {
    return this.value.startsWith(attr.value + ".");
  }
}

export class IndexElement {
  element: AttrValue[];

  constructor(element: AttrValue[]) {
    this.element = element;
  }

  toString(): string {
    return this.element.join(".");
  }

  clone(): IndexElement {
    return new IndexElement(this.element.slice());
  }
}

export class Index {
  attr: Attribute;
  children: Map<string, Index[]>;

  constructor(attr: Attribute, children: Map<string, Index[]>) {
    this.attr = attr;
    this.children = children;
  }

  getMaxLevel(): number {
    let nextLen = 0;
    for (const nextValues of this.children.values()) {
      for (const nextValue of nextValues) {
        nextLen = Math.max(nextLen, nextValue.getMaxLevel());
      }
    }
    return 1 + nextLen;
  }

  size(): number {
    let size = 0;
    for (const nextValues of this.children.values()) {
      if (nextValues.length === 0) {
        size++;
      } else {
        for (const nextValue of nextValues) {
          size += nextValue.size();
        }
      }
    }
    return size;
  }

  static deserialize(obj: any) {
    const map = new Map();
    for (const [key, value] of obj.children) {
      map.set(key, (value as any).map(Index.deserialize));
    }
    return new Index(new Attribute(obj.attr), map);
  }
}

export class ReportDataPoint {
  x: IndexElement;
  y: IndexElement;
  z: Attribute;
  recordId: number;
  recordValue: AttrValue;

  constructor(
    x: IndexElement,
    y: IndexElement,
    z: Attribute,
    recordId: number,
    recordValue: AttrValue
  ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.recordId = recordId;
    this.recordValue = recordValue;
  }
}

export class ReportData {
  data: ReportDataPoint[];
  xIndex: Index[];
  yIndex: Index[];
  zvalues: [number | null, Attribute[]][];

  constructor(
    data: ReportDataPoint[],
    xIndex: Index[],
    yIndex: Index[],
    zvalues: [number | null, Attribute[]][]
  ) {
    this.data = data;
    this.xIndex = xIndex;
    this.yIndex = yIndex;
    this.zvalues = zvalues;
  }

  static deserialize(obj: any, basereport: BaseReport) {
    return new ReportData(
      obj.data.map(
        (d: any) =>
          new ReportDataPoint(
            new IndexElement(d.x),
            new IndexElement(d.y),
            new Attribute(d.z),
            d.record_id,
            d.record_value
          )
      ),
      obj.xindex.map(Index.deserialize),
      obj.yindex.map(Index.deserialize),
      basereport.zvalues.map((zvalue) => [
        zvalue[0],
        zvalue[1].map((a) => a.attr),
      ])
    );
  }
}

export class AutoTableReportRowData {
  recordId: number;
  headers: (string | boolean | number | null)[];
  values: (string | boolean | number | null)[];

  constructor(
    recordId: number,
    headers: (string | boolean | number | null)[],
    values: (string | boolean | number | null)[]
  ) {
    this.recordId = recordId;
    this.headers = headers;
    this.values = values;
  }
}

export class AutoTableReportGroupData {
  attrHeaders: Attribute[];
  rows: AutoTableReportRowData[];

  constructor(attrHeaders: Attribute[], rows: AutoTableReportRowData[]) {
    this.attrHeaders = attrHeaders;
    this.rows = rows;
  }

  static deserialize(obj: any) {
    return new AutoTableReportGroupData(
      obj.attr_headers.map((a: any) => new Attribute(a)),
      obj.rows.map(
        (r: any) => new AutoTableReportRowData(r.record_id, r.headers, r.values)
      )
    );
  }
}

export class AutoTableReportData {
  groups: [string, AutoTableReportGroupData][];
  valueHeaders: Attribute[];

  constructor(
    groups: [string, AutoTableReportGroupData][],
    valueHeaders: Attribute[]
  ) {
    this.groups = groups;
    this.valueHeaders = valueHeaders;
  }

  static deserialize(obj: any) {
    return new AutoTableReportData(
      obj.groups.map((g: any) => [
        g[0],
        AutoTableReportGroupData.deserialize(g[1]),
      ]),
      obj.value_headers.map((a: any) => new Attribute(a))
    );
  }
}
