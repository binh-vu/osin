import { makeStyles } from "@mui/styles";
import { Alert } from "antd";
import axios from "axios";
import {
  AutoTableReportData,
  ReportData,
  TableComponent,
} from "components/reports";
import { AutoTableComponent } from "components/reports/table/components/AutoTableComponent";
import { SERVER } from "env";
import { InternalLink, LoadingComponent } from "gena-app";
import { useStores } from "models";
import {
  AutoTableReport,
  BaseReport,
  Report,
  ReportTableArgs,
} from "models/reports";
import {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { routes } from "routes";

const useStyles = makeStyles({
  root: {},
});

export interface ReportTableFunc {
  reload: () => Promise<void>;
}

/**
 * A component that displays a report.
 */
export const ReportComponent = forwardRef(
  (
    {
      expId,
      report,
      enableReload,
    }: {
      expId: number;
      report: Report;
      enableReload?: boolean;
    },
    ref: ForwardedRef<ReportTableFunc>
  ) => {
    const { reportStore } = useStores();
    const classes = useStyles();
    const [data, setData] = useState<
      ReportData | AutoTableReportData | undefined
    >(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const onReload = () => {
      return reportStore
        .getReportData(report.id)
        .then((reportData) => {
          setData(reportData);
        })
        .catch((reason) => {
          if (reason.response === undefined) {
            console.error(reason);
            setError("Encounter error during rendering the report.");
          } else {
            setError(reason.response.data.message);
          }
        });
    };
    useEffect(() => {
      onReload();
    }, []);
    useImperativeHandle(ref, () => ({
      reload: onReload,
    }));

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
      return <LoadingComponent />;
    } else if (data === null) {
      return <div>Not Found</div>;
    }

    if (data instanceof ReportData && report.args.value instanceof BaseReport) {
      return (
        <div className={classes.root}>
          <TableComponent
            recordKey={report.id.toString()}
            reportData={data}
            zvalues={report.args.value.zvalues}
            title={`Table ${report.id}. ${report.name}`}
            editURL={{
              path: routes.updatereport,
              urlArgs: { expId, reportId: report.id },
              queryArgs: {},
            }}
            onReload={enableReload ? onReload : undefined}
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
        </div>
      );
    }

    if (
      data instanceof AutoTableReportData &&
      report.args.value instanceof AutoTableReport
    ) {
      return <AutoTableComponent reportData={data} />;
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
