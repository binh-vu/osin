import { makeStyles } from "@mui/styles";
import axios from "axios";
import { ReportData, TableComponent } from "components/reports";
import { SERVER } from "env";
import { LoadingComponent } from "gena-app";
import { Report, ReportTableArgs } from "models/reports";
import { useEffect, useState } from "react";
import { routes } from "routes";

const useStyles = makeStyles({
  root: {},
});

export const ReportTable = ({
  expId,
  report,
}: {
  expId: number;
  report: Report;
}) => {
  const classes = useStyles();
  const tableargs = report.args as ReportTableArgs;
  const [data, setData] = useState<ReportData | undefined | null>(undefined);

  useEffect(() => {
    axios.get(`${SERVER}/api/report/${report.id}/data`).then((res) => {
      setData(ReportData.deserialize(res.data.data));
    });
  }, []);

  if (data === undefined) {
    return <LoadingComponent />;
  } else if (data === null) {
    return <div>Not Found</div>;
  }

  return (
    <div className={classes.root}>
      <TableComponent
        reportData={data}
        zvalues={report.args.value.zvalues}
        title={`Table ${report.id}. ${report.name}`}
        editURL={{
          path: routes.updatereport,
          urlArgs: { expId, reportId: report.id },
          queryArgs: {},
        }}
      />
    </div>
  );
};
