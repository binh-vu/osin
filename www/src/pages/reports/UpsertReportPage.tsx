import { makeStyles } from "@mui/styles";
import { Divider, Tag, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { ReportStore, useStores } from "models";
import { useEffect } from "react";
import { routes } from "routes";
import { ReportForm } from "./forms/ReportForm";

const useStyles = makeStyles({
  divider: {
    margin: "12px 0px",
  },
});

export const UpsertReportPage = observer(() => {
  const classes = useStyles();
  const newreportParams = routes.newreport.useURLParams();
  const updatereportParams = routes.updatereport.useURLParams();

  let expId: number, reportId: number | undefined;
  if (newreportParams !== null) {
    expId = newreportParams.expId;
    reportId = undefined;
  } else {
    expId = updatereportParams!.expId;
    reportId = updatereportParams!.reportId;
  }
  const { expStore, reportStore } = useStores();

  useEffect(() => {
    expStore.fetchById(expId);
    if (reportId !== undefined) {
      reportStore.fetchById(reportId);
    }
  }, [expStore, expId]);

  const exp = expStore.get(expId);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }
  let report = undefined;
  if (reportId !== undefined) {
    report = reportStore.get(reportId);
    if (report === undefined) {
      return <LoadingComponent />;
    } else if (report === null) {
      return <NotFoundComponent />;
    }
  }

  return (
    <div className="mr-16 ml-16">
      <Typography.Title level={5}>
        {reportId === undefined ? "NEW" : "UPDATE"} REPORT
      </Typography.Title>
      <p>
        <Tag color="blue">VERSION {exp.version}</Tag>
        <InternalLink
          path={routes.expSetup}
          urlArgs={{ expId: exp.id }}
          queryArgs={{}}
          style={{ fontWeight: 600 }}
        >
          {exp.name}
        </InternalLink>
        : {exp.description}
      </p>
      <Divider className={classes.divider} />
      <ReportForm
        key={`${report === undefined ? "" : report.id}`}
        report={report}
        expId={expId}
      />
    </div>
  );
});
