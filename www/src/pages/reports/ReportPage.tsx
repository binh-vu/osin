import { makeStyles } from "@mui/styles";
import { Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { Report, useStores } from "models";
import { COLUMN_MAX_SIZE, Position } from "models/reports";
import React, { useEffect } from "react";
import { routes } from "routes";
import { ReportTable } from "./reports/ReportTable";

const useStyles = makeStyles({
  divider: {
    margin: 0,
  },
});

export const ReportPage = observer(() => {
  const classes = useStyles();
  const expId = routes.reports.useURLParams()!.expId;
  const { expStore } = useStores();

  useEffect(() => {
    // find report by experiment ids
    expStore.fetchById(expId);
  }, [expStore, expId]);

  const exp = expStore.get(expId);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }

  // open a page that users can create a new report
  const addReport = () => {
    routes.newreport.path({ expId: expId }).open();
  };

  return (
    <div className="ml-16 mr-16">
      <Row wrap={false}>
        <Col flex="auto">
          <Typography.Title level={5}>DASHBOARD</Typography.Title>
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
        </Col>
        <Col flex="none">
          <Button type="primary" size="large" onClick={addReport}>
            Add Report
          </Button>
        </Col>
      </Row>
      <Divider className={classes.divider} />
      <ReportGrids expId={expId} />
    </div>
  );
});

interface ReportGrid {
  columns: {
    span: number;
    offset: number;
    element?: React.ReactElement;
    key: React.Key;
  }[];
  key: React.Key;
}

const ReportGrids = observer(({ expId }: { expId: number }) => {
  const { reportStore, expReportStore } = useStores();

  useEffect(() => {
    expReportStore.fetchByExpId(expId, 1000, 0).then((expreports) => {
      reportStore.fetchByIds(expreports.map((x) => x.reportId));
    });
  }, [expReportStore, reportStore, expId]);

  const reportAndPos: [Report, Position][] = expReportStore
    .getReportsByExpId(expId)
    .map(([expreport, report]) => {
      const pos = expreport.position || {
        rowOrder: -100,
        colSpan: 24,
        colOffset: 0,
      };
      return [report, pos];
    });
  // it's a stable sort, ascending order
  reportAndPos.sort((a, b) => b[1].rowOrder - a[1].rowOrder);

  const reportGrids: ReportGrid[] = [];
  let lastRowLength = 0;
  for (const [report, pos] of reportAndPos) {
    const col = {
      span: pos.colSpan,
      offset: pos.colOffset,
      key: report.id,
      element: getReportElement(expId, report),
    };
    if (
      reportGrids.length > 0 &&
      pos.colSpan + pos.colOffset + lastRowLength <= COLUMN_MAX_SIZE
    ) {
      // fit the current row
      reportGrids[reportGrids.length - 1].columns.push(col);
    } else {
      reportGrids.push({
        columns: [col],
        key: report.id,
      });
      lastRowLength = 0;
    }
    lastRowLength += pos.colSpan + pos.colOffset;
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {reportGrids.map((row) => (
        <Row key={row.key}>
          {row.columns.map((col) => (
            <Col key={col.key} span={col.span} offset={col.offset}>
              {col.element}
            </Col>
          ))}
        </Row>
      ))}
    </Space>
  );
});

export function getReportElement(expId: number, report: Report) {
  if (report.args.type === "table") {
    return <ReportTable report={report} expId={expId} />;
  }

  throw new Error("Unknown report type: " + report.args.type);
}
