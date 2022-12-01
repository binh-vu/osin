import { makeStyles } from "@mui/styles";
import { Alert } from "antd";
import axios from "axios";
import { ReportData, TableComponent } from "components/reports";
import { SERVER } from "env";
import { InternalLink, LoadingComponent } from "gena-app";
import { useStores } from "models";
import { Report, ReportTableArgs } from "models/reports";
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

export const ReportTable = forwardRef(
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
    const [data, setData] = useState<ReportData | undefined | null>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const onReload = () => {
      return reportStore
        .getReportData(report.id)
        .then((reportData) => {
          setData(reportData);
        })
        .catch((reason) => {
          setError(reason.response.data.message);
        });
    };
    useEffect(() => {
      onReload();
    }, []);
    useImperativeHandle(ref, () => ({
      reload: onReload,
    }));

    if (data === undefined) {
      return <LoadingComponent />;
    } else if (data === null) {
      return <div>Not Found</div>;
    }

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
);
