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
  Axis,
  ExpIndex,
  Index,
  IndexProperty,
  Report,
  ReportTableArgs,
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
        xaxis: deserializeAxis(record.args.value.xaxis),
        yaxis: deserializeAxis(record.args.value.yaxis),
        zvalues: record.args.value.zvalues.map(deserializeIndex),
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

const deserializeIndex = (index: any): Index | ExpIndex => {
  if (index.indices !== undefined) {
    return new ExpIndex(index.indices, index.values);
  }
  return new Index(index.index, index.values, index.property);
};

const deserializeAxis = (axis: any): Axis => {
  return new Axis(axis.indices.map(deserializeIndex));
};
