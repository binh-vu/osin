import { SERVER } from "env";
import { CRUDJunctionStore } from "gena-app";
import { Experiment, ExperimentStore } from "../experiments";
import { ExpReport } from "./ExpReport";
import { Report } from "./Report";
import { ReportStore } from "./ReportStore";

export class ExpReportStore extends CRUDJunctionStore<
  number,
  number,
  number,
  Omit<ExpReport, "id">,
  ExpReport,
  ExpReport,
  Experiment,
  Report,
  ExperimentStore,
  ReportStore
> {
  constructor(expStore: ExperimentStore, reportStore: ReportStore) {
    super(expStore, reportStore, `${SERVER}/api/expreport`, "exp", "report");

    this.storeB.addOnDeleteListener((report) =>
      this.onDeleteCascadeTableB(report.id)
    );
    // TODO: make me more efficient, don't have to delete to refetch
    this.storeB.addOnUpdateListener((draft, report) =>
      this.onDeleteCascadeTableB(report.id)
    );
  }

  async fetchByExpId(
    expId: number,
    limit: number,
    offset: number
  ): Promise<ExpReport[]> {
    return super.fetchByAID(expId, limit, offset);
  }

  async fetchByReportId(
    reportId: number,
    limit: number,
    offset: number
  ): Promise<ExpReport[]> {
    return super.fetchByBID(reportId, limit, offset);
  }

  getExperimentsByReportId(reportId: number): [ExpReport, Experiment][] {
    const record = this.tblB.get(reportId);
    if (record === undefined) return [];

    const output: [ExpReport, Experiment][] = [];
    for (const jid of record.links.values()) {
      const expreport = this.records.get(jid)!;
      const exp = this.storeA.get(expreport.expId);

      if (exp !== undefined && exp !== null) {
        output.push([expreport, exp]);
      }
    }
    return output;
  }

  getReportsByExpId(expId: number): [ExpReport, Report][] {
    const record = this.tblA.get(expId);
    if (record === undefined) return [];

    const output: [ExpReport, Report][] = [];
    for (const jid of record.links.values()) {
      const expreport = this.records.get(jid)!;
      const report = this.storeB.get(expreport.reportId);

      if (report !== undefined && report !== null) {
        output.push([expreport, report]);
      }
    }
    return output;
  }

  public deserialize(record: any) {
    let pos = undefined;
    if (record.position !== null) {
      pos = {
        rowOrder: record.position.row_order,
        colSpan: record.position.col_span,
        colOffset: record.position.col_offset,
      };
    }
    return new ExpReport(record.id, record.exp_id, record.report_id, pos);
  }

  public serializeCreateDraft(record: Omit<ExpReport, "id">) {
    return {
      exp: record.expId,
      report: record.reportId,
      position:
        record.position === undefined
          ? undefined
          : {
              row_order: record.position.rowOrder,
              col_span: record.position.colSpan,
              col_offset: record.position.colOffset,
            },
    };
  }

  public serializeUpdateDraft(record: ExpReport) {
    return {
      id: record.id,
      exp: record.expId,
      report: record.reportId,
      position:
        record.position === undefined
          ? undefined
          : {
              row_order: record.position.rowOrder,
              col_span: record.position.colSpan,
              col_offset: record.position.colOffset,
            },
    };
  }
}
