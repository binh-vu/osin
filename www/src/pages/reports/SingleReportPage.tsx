import { makeStyles } from "@mui/styles";
import { Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { Report, useStores } from "models";
import { COLUMN_MAX_SIZE, Position } from "models/reports";
import React, { useEffect } from "react";
import { routes } from "routes";
import { getReportElement } from "./ReportPage";
import { ReportComponent } from "./ReportComponent";

/**
 * A page that displays a single report.
 */
export const SingleReportPage = observer(() => {
  const { reportStore } = useStores();
  const { reportId, expId } = routes.viewreport.useURLParams()!;

  useEffect(() => {
    reportStore.fetchById(reportId);
  }, [reportId]);

  let report = reportStore.get(reportId);
  if (report === undefined) {
    return <LoadingComponent />;
  } else if (report === null) {
    return <NotFoundComponent />;
  }

  return (
    <Row>
      <Col span={24}>{getReportElement(expId, report)}</Col>
    </Row>
  );
});
