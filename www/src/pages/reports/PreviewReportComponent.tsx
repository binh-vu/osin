import { Alert } from "antd";
import {
  AutoTableReportData,
  ReportData,
  TableComponent,
} from "components/reports";
import { AutoTableComponent } from "components/reports/table/components/AutoTableComponent";
import { InternalLink, LoadingComponent } from "gena-app";
import { autorun, comparer } from "mobx";
import { observer } from "mobx-react";
import { useStores } from "models";
import {
  AutoTableReport,
  BaseReport,
  DraftCreateReport,
  DraftUpdateReport,
} from "models/reports";
import { useEffect, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { routes } from "routes";

/**
 * A component that displays a preview of a report.
 */
export const PreviewReportComponent = observer(
  ({
    expId,
    report,
  }: {
    expId: number;
    report: DraftCreateReport | DraftUpdateReport;
  }) => {
    const { reportStore } = useStores();
    const [data, setData] = useState<
      ReportData | AutoTableReportData | undefined
    >(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
      // console.log("PreviewReport: create autorun");
      let previousReport: [BaseReport | AutoTableReport, number[]] | undefined =
        undefined;
      const disposer = autorun(() => {
        if (
          !comparer.structural(previousReport, [report.args.value, report.exps])
        ) {
          // console.log("PreviewReport: autorun");
          previousReport = [report.args.value.clone(), report.exps.slice()];
          if (!report.args.value.isValid()) {
            setError(
              "The report does not have enough information to be displayed."
            );
            return;
          }
          reportStore
            .previewReportData(report)
            .then((data) => {
              unstable_batchedUpdates(() => {
                setData(data);
                setError(undefined);
              });
            })
            .catch((reason) => {
              if (reason.response === undefined) {
                console.error(reason);
                setError("Encounter error during rendering the report.");
              } else {
                setError(reason.response.data.message);
              }
            });
        }
      });
      return () => {
        // console.log("PreviewReport: dispose autorun");
        disposer();
      };
    }, []);

    if (error !== undefined) {
      return (
        <Alert
          message="Error"
          description={error}
          type="error"
          className="mb-8"
        />
      );
    }

    if (data === undefined) {
      return <LoadingComponent msg="Loading preview..." />;
    }

    if (data instanceof ReportData && report.args.value instanceof BaseReport) {
      return (
        <TableComponent
          recordKey={`preview-${expId}-${
            report instanceof DraftUpdateReport ? report.id : report.draftID
          }`}
          reportData={data}
          zvalues={report.args.value.zvalues}
          title={`Table. ${report.name}`}
          editURL={{
            path: routes.updatereport,
            urlArgs: { expId, reportId: -1 },
            queryArgs: {},
          }}
          renderRecordId={(recordId: number) => {
            return (
              <InternalLink
                path={routes.run}
                urlArgs={{ runId: recordId }}
                queryArgs={{}}
                openInNewPage={true}
              >
                Run {recordId}{" "}
              </InternalLink>
            );
          }}
        />
      );
    }

    if (
      data instanceof AutoTableReportData &&
      report.args.value instanceof AutoTableReport
    ) {
      return (
        <AutoTableComponent reportData={data} title={`Table. ${report.name}`} />
      );
    }

    return (
      <Alert
        message="Error. Unreachable code."
        description={error}
        type="error"
        className="mb-8"
      />
    );
  }
);
