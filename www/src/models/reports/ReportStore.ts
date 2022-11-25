import axios from "axios";
import { Attribute, AttrValue } from "components/reports";
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
  DraftUpdateReport,
  BaseReport,
} from "./Report";

export interface DraftCreateReport
  extends DraftCreateRecord,
    Omit<Report, "id"> {
  exp: number;
  exps: number[];
  position: Position;
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
      fetchAttrValues: action,
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

  async fetchAttrValues(
    attr: Attribute,
    experimentIds: number[]
  ): Promise<AttrValue[]> {
    const params = {
      exps: experimentIds.join(","),
      attr: attr.path.join("."),
    };
    const key = JSON.stringify([params.attr, params.exps]);
    if (!this.cacheQueryDimensionValues.has(key)) {
      const resp = await axios.get(`${SERVER}/api/report/get-attr-values`, {
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
      new ReportTableArgs(
        record.args.type,
        new BaseReport(
          deserializeIndexSchema(record.args.value.x_axis),
          deserializeIndexSchema(record.args.value.y_axis),
          deserializeZValues(record.args.value.z_values)
        )
      )
    );
  }

  protected serializeRecord(
    record: DraftCreateReport | DraftUpdateReport
  ): object {
    const r = super.serializeRecord(record) as any;
    r.args = {
      type: record.args.type,
      value: {
        x_axis: serializeIndexSchema(record.args.value.xaxis),
        y_axis: serializeIndexSchema(record.args.value.yaxis),
        z_values: record.args.value.zvalues.map(([expid, attrs]) => [
          expid,
          attrs.map(serializeAttrGetter),
        ]),
      },
    };
    r.position = {
      row_order: r.position.rowOrder,
      col_span: r.position.colSpan,
      col_offset: r.position.colOffset,
    };

    return r;
  }
}

const deserializeAttrGetter = (obj: any): AttrGetter => {
  return new AttrGetter(
    new Attribute(obj.path),
    obj.values === null ? undefined : obj.values
  );
};

const serializeAttrGetter = (getter: AttrGetter): any => {
  return {
    path: getter.attr.path,
    values: getter.values,
  };
};

const deserializeIndexSchema = (obj: any): IndexSchema => {
  return new IndexSchema(
    obj.attrs.map(deserializeAttrGetter),
    obj.index2children,
    obj.fully_observed_attrs
  );
};

const serializeIndexSchema = (schema: IndexSchema): any => {
  return {
    attrs: schema.attrs.map(serializeAttrGetter),
    index2children: schema.index2children,
    fully_observed_attrs: schema.fullyObserverdAttrs,
  };
};

const deserializeZValues = (obj: any): [number | null, AttrGetter[]][] => {
  return obj.map(([expid, vs]: any) => {
    return [expid, vs.map(deserializeAttrGetter)];
  });
};
