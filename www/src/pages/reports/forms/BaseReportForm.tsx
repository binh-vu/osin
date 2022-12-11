import { Col, Row, Space, Typography } from "antd";
import { observer } from "mobx-react";
import { Experiment } from "models";
import {
  BaseReport,
  DraftCreateReport,
  DraftUpdateReport,
} from "models/reports";
import {
  IndexSchemaForm,
  ZValueForm,
} from "pages/reports/forms/IndexSchemaForm";
import { useStyles } from "./ReportForm";

export const BaseReportForm = observer(
  ({
    classes,
    exps,
    baseReport,
  }: {
    classes: ReturnType<typeof useStyles>;
    baseReport: BaseReport;
    exps: Experiment[];
  }) => {
    return (
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              X Axis
            </Typography.Title>
            <IndexSchemaForm index={baseReport.xaxis} exps={exps} />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Y Axis
            </Typography.Title>
            <IndexSchemaForm index={baseReport.yaxis} exps={exps} />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Z Values
            </Typography.Title>
            <ZValueForm
              exps={exps}
              zvalues={baseReport.zvalues}
              setZValues={(zvalues) => {
                baseReport.zvalues = zvalues;
              }}
            />
          </Col>
        </Row>
      </Space>
    );
  }
);
