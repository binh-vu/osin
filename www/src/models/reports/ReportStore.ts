import axios from "axios";
import {
  Attribute,
  AttrValue,
  AutoTableReportData,
  ReportData,
} from "components/reports";
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
  AutoTableReport,
  RecordFilter,
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

  async getReportData(reportId: number): Promise<ReportData> {
    return axios.get(`${this.remoteURL}/${reportId}/data`).then((res) => {
      return ReportData.deserialize(res.data.data);
    });
  }

  async previewReportData(
    draft: DraftCreateReport | DraftUpdateReport
  ): Promise<ReportData | AutoTableReportData> {
    return axios
      .post(
        `${this.remoteURL}/preview`,
        draft instanceof DraftUpdateReport
          ? this.serializeUpdateDraft(draft)
          : this.serializeCreateDraft(draft)
      )
      .then((res) => {
        return draft.args.type === "auto_table"
          ? AutoTableReportData.deserialize(res.data.data)
          : ReportData.deserialize(res.data.data);
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
    let value;
    if (record.args.type === "table") {
      value = new BaseReport(
        deserializeIndexSchema(record.args.value.x_axis),
        deserializeIndexSchema(record.args.value.y_axis),
        deserializeZValues(record.args.value.z_values)
      );
    } else if (record.args.type === "auto_table") {
      value = new AutoTableReport(
        record.args.value.groups.map(([group, filter]: any) => {
          return [
            group,
            new RecordFilter(filter.is_in.map(deserializeAttrGetter)),
          ];
        }),
        record.args.value.z_values.map(deserializeAttrGetter),
        record.args.value.ignore_list_attr
      );
    } else {
      throw new Error(`Unknown report type: ${record.args.type}`);
    }

    return new Report(
      record.id,
      record.name,
      record.description,
      new ReportTableArgs(record.args.type, value)
    );
  }

  protected serializeRecord(
    record: DraftCreateReport | DraftUpdateReport
  ): object {
    const r = super.serializeRecord(record) as any;
    let value;
    if (record.args.value instanceof BaseReport) {
      value = {
        x_axis: serializeIndexSchema(record.args.value.xaxis),
        y_axis: serializeIndexSchema(record.args.value.yaxis),
        z_values: record.args.value.zvalues.map(([expid, attrs]) => [
          expid,
          attrs.map(serializeAttrGetter),
        ]),
      };
    } else if (record.args.value instanceof AutoTableReport) {
      value = {
        groups: record.args.value.groups.map(([group, filter]) => {
          return [group, { is_in: filter.isIn.map(serializeAttrGetter) }];
        }),
        z_values: record.args.value.zvalues.map(serializeAttrGetter),
        ignore_list_attr: record.args.value.ignoreListAttr,
      };
    } else {
      throw new Error(`Unknown report type: ${record.args.type}`);
    }

    r.args = {
      type: record.args.type,
      value,
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
