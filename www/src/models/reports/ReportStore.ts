import axios from "axios";
import { SERVER } from "env";
import {
  SimpleCRUDStore,
  CRUDStore,
  DraftUpdateRecord,
  DraftCreateRecord,
} from "gena-app";
import { action, makeObservable, observable, override } from "mobx";
import { Position } from "./ExpReport";
import {
  IndexProperty,
  Report,
  ReportTableArgs,
  IndexSchema,
  AttrGetter,
  Attribute,
} from "./Report";

export interface DraftCreateReport
  extends DraftCreateRecord,
    Omit<Report, "id"> {
  exp: number;
  exps: number[];
  position: Position | null;
}

export interface DraftUpdateReport
  extends DraftUpdateRecord<number, Report>,
    Report {
  exp: number;
  exps: number[];
  position: Position | null;
}

export class ReportStore extends CRUDStore<
  number,
  DraftCreateReport,
  DraftUpdateReport,
  Report
> {
  public cacheQueryDimensionValues: Map<string, (string | number | boolean)[]> =
    new Map();

  constructor() {
    super(`${SERVER}/api/report`, {}, false, []);

    makeObservable(this, {
      cacheQueryDimensionValues: observable,
      fetchIndexValues: action,
      create: override,
      update: override,
    });
  }

  async create(draft: Omit<DraftCreateReport, "draftID">): Promise<Report> {
    return super.create(Object.assign({ draftID: "" }, draft), true);
  }

  async update(
    draft: Omit<DraftUpdateReport, "markSaved" | "toModel">
  ): Promise<Report> {
    return super.update(
      Object.assign(
        {
          markSaved: () => {},
          toModel: () => undefined,
        },
        draft
      ),
      true
    );
  }

  async fetchIndexValues(
    dims: string[],
    experimentIds: number[],
    property: IndexProperty
  ): Promise<(string | number | boolean)[]> {
    const params = {
      exps: experimentIds.join(","),
      dim: dims.join("."),
      property,
    };
    const key = JSON.stringify([params.dim, params.property, params.exps]);
    if (!this.cacheQueryDimensionValues.has(key)) {
      const resp = await axios.get(`${SERVER}/api/report/get-index-values`, {
        params,
      });
      this.cacheQueryDimensionValues.set(key, resp.data.items);
    }

    return this.cacheQueryDimensionValues.get(key)!;
  }

  public deserialize(record: any): Report {
    return new Report(
      record.id,
      record.name,
      record.description,
      new ReportTableArgs(record.args.type, {
        xaxis: deserializeIndexSchema(record.args.value.x_axis),
        yaxis: deserializeIndexSchema(record.args.value.y_axis),
        zvalues: record.args.value.z_values.map(deserializeAttrGetter),
      })
    );
  }

  protected serializeRecord(
    record: DraftCreateReport | DraftUpdateReport
  ): object {
    const r = super.serializeRecord(record) as any;
    if (r.position !== null) {
      r.position = {
        row_order: r.position.rowOrder,
        col_span: r.position.colSpan,
        col_offset: r.position.colOffset,
      };
    }
    return r;
  }
}

const deserializeAttrGetter = (obj: any): AttrGetter => {
  return new AttrGetter(new Attribute(obj.path), obj.values);
};

const deserializeIndexSchema = (obj: any): IndexSchema => {
  return new IndexSchema(
    obj.attrs.map(deserializeAttrGetter),
    obj.index2children,
    obj.fullyObserverdAttrs
  );
};
