import { makeStyles } from "@mui/styles";
import {
  Alert,
  Button,
  Col,
  Divider,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import {
  AutoTableReportData,
  ReportData,
  TableComponent,
} from "components/reports";
import { AutoTableComponent } from "components/reports/autotable/AutoTableComponent";
import { InternalLink, LoadingComponent } from "gena-app";
import { Filter } from "misc";
import { autorun, comparer, reaction, runInAction, toJS } from "mobx";
import { observer } from "mobx-react";
import { Report, useStores } from "models";
import {
  AutoTableReport,
  BaseReport,
  COLUMN_MAX_SIZE,
  DraftCreateReport,
  DraftUpdateReport,
  IndexSchema,
  ReportTableArgs,
} from "models/reports";
import {
  IndexSchemaForm,
  ZValueForm,
} from "pages/reports/forms/IndexSchemaForm";
import { createRef, useEffect, useMemo, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { routes } from "routes";
import { PreviewReportComponent } from "../PreviewReportComponent";
import { ReportComponent, ReportTableFunc } from "../ReportComponent";
import { AutoTableForm } from "./AutoTableForm";
import { BaseReportForm } from "./BaseReportForm";

export const useStyles = makeStyles({
  form: {},
  card: {
    border: "1px solid #ddd",
    "& .ant-card-head-title": {
      fontSize: 16,
      fontWeight: 500,
    },
    "& .ant-card-actions": {
      borderTop: "1px solid #ddd",
    },
    "& .ant-card-actions a:not(.ant-btn)": {
      color: "rgba(0, 0, 0, 0.85)",
    },
    "& .ant-card-actions > li:not(:last-child)": {
      borderRight: "1px solid #ddd",
    },
  },
  errormsg: {
    border: "none",
    backgroundColor: "transparent",
    "& .ant-alert-message": {
      color: "#ff4d4f",
    },
  },
  formItemLabel: {
    fontSize: "15px !important",
  },
});

export const ReportForm = observer(
  ({ report, expId }: { report?: Report; expId: number }) => {
    const classes = useStyles();
    const { expStore, reportStore, expReportStore } = useStores();

    const draftReport: DraftCreateReport | DraftUpdateReport = useMemo(() => {
      if (report === undefined) {
        const draftID = `newreport-${expId}`;
        if (reportStore.getCreateDraft(draftID) === undefined) {
          reportStore.setCreateDraft({
            draftID,
            exp: expId,
            exps: [expId],
            position: {
              rowOrder: 0,
              colSpan: 24,
              colOffset: 0,
            },
            name: "",
            description: "",
            args: new ReportTableArgs("table", BaseReport.default()),
          });
        }
        return reportStore.getCreateDraft(draftID)!;
      }

      if (reportStore.getUpdateDraft(report.id) === undefined) {
        reportStore.setUpdateDraft(
          new DraftUpdateReport(
            report.id,
            report.name,
            report.description,
            report.args,
            expId,
            [expId],
            {
              rowOrder: 0,
              colSpan: 24,
              colOffset: 0,
            }
          )
        );
      }
      return reportStore.getUpdateDraft(report.id)!;
    }, [report]);

    useEffect(() => {
      // fetch all experiments cause we haven't implement the search by name yet
      expStore.fetchAllExperiments().then(() => {
        if (report !== undefined) {
          expReportStore.fetchByReportId(report.id, 1000, 0).then(() => {
            const lst = expReportStore.getExperimentsByReportId(report.id);
            const exps = lst.map(([_expreport, exp]) => exp);
            const expreports = lst.filter(
              ([_expreport, exp]) => exp.id === expId
            );

            if (
              expreports.length > 0 &&
              expreports[0][0].position !== undefined
            ) {
              draftReport.position = expreports[0][0].position;
            }
            draftReport.exps = exps.map((exp) => exp.id);
          });
        }
      });
    }, [
      expStore,
      expId,
      report === undefined ? undefined : report.id,
      draftReport,
    ]);

    // options to select experiments
    const expoptions = useMemo(() => {
      const options = [];
      for (const exp of expStore.records.values()) {
        if (exp === null) continue;
        options.push({
          label: `${exp.name} (version ${exp.version})`,
          value: exp.id,
        });
      }
      options.sort((a, b) => -a.label.localeCompare(b.label));
      return options;
    }, [expStore.records.size]);

    // do in a memo to avoid creating new exps array everytime that will trigger re-rendering
    const exps = useMemo(() => {
      return draftReport.exps
        .map((expId) => expStore.get(expId))
        .filter(Filter.notNullOrUndefined);
    }, [expStore.records.size, draftReport.exps.join(",")]);
    if (exps.length === 0) {
      return <LoadingComponent />;
    }

    const onSubmit = () => {
      if (report === undefined) {
        reportStore.create(draftReport).then((resp) => {
          routes.updatereport.path({ expId: expId, reportId: resp.id }).open();
        });
      } else {
        reportStore.update(draftReport as DraftUpdateReport);
      }
    };

    const onDelete = () => {
      reportStore.delete(report!.id).then(() => {
        routes.reports.path({ expId: expId }).open();
      });
    };

    // position status
    let posstatus = "";
    let posmsg = undefined;
    if (draftReport.position.colSpan === null) {
      posstatus = "span";
      posmsg = "span must be an integer between 1 and 24";
    } else if (draftReport.position.colOffset === null) {
      posstatus = "leftoffset";
      posmsg = "left offset must be an integer between 0 and 23";
    } else if (
      draftReport.position.colSpan + draftReport.position.colOffset >
      COLUMN_MAX_SIZE
    ) {
      posstatus = "span";
      posmsg = `span + offset must be less than or equal to ${COLUMN_MAX_SIZE}`;
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Name
            </Typography.Title>
            <Input
              value={draftReport.name}
              onChange={(e) => {
                draftReport.name = e.target.value;
              }}
              placeholder="enter the report's name"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Description
            </Typography.Title>
            <Input
              value={draftReport.description}
              onChange={(e) => (draftReport.description = e.target.value)}
              placeholder="enter the report's description"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Type
            </Typography.Title>
            <Select
              value={draftReport.args.type}
              style={{ width: "100%" }}
              options={[
                { label: "Table", value: "table" },
                { label: "Auto Table", value: "auto_table" },
              ]}
              onChange={(value: "table" | "auto_table") => {
                if (value !== draftReport.args.type) {
                  draftReport.args.type = value;
                  draftReport.args.value =
                    value === "table"
                      ? BaseReport.default()
                      : AutoTableReport.default();
                }
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Experiments
            </Typography.Title>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              options={expoptions}
              value={draftReport.exps}
              onChange={(values) => {
                if (values.every((eid) => eid !== draftReport.exp)) {
                  values.push(draftReport.exp);
                }
                draftReport.exps = values;
              }}
            />
          </Col>
        </Row>
        {draftReport.args.value instanceof BaseReport ? (
          <BaseReportForm
            classes={classes}
            baseReport={draftReport.args.value}
            exps={exps}
          />
        ) : (
          <AutoTableForm
            classes={classes}
            autoTableReport={draftReport.args.value}
            exps={exps}
          />
        )}
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              <Space direction="horizontal">
                Positions
                <InputNumber
                  addonBefore="row"
                  value={draftReport.position.rowOrder}
                  size="large"
                  onChange={(value) => (draftReport.position.rowOrder = value!)}
                />
                <InputNumber
                  addonBefore="span"
                  min={1}
                  max={COLUMN_MAX_SIZE}
                  value={draftReport.position.colSpan}
                  size="large"
                  status={
                    posstatus === "span" || posstatus === "all" ? "error" : ""
                  }
                  onChange={(value) => (draftReport.position.colSpan = value!)}
                />
                <InputNumber
                  addonBefore="offset"
                  min={0}
                  max={COLUMN_MAX_SIZE - 1}
                  value={draftReport.position.colOffset}
                  status={
                    posstatus === "leftoffset" || posstatus === "all"
                      ? "error"
                      : ""
                  }
                  size="large"
                  onChange={(value) =>
                    (draftReport.position.colOffset = value!)
                  }
                />
              </Space>
            </Typography.Title>
            {posmsg !== undefined && (
              <Alert
                className={classes.errormsg}
                message={posmsg}
                type="error"
                showIcon={true}
              />
            )}
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Space>
              {draftReport.args.value instanceof BaseReport ? (
                <Button
                  onClick={() => {
                    if (draftReport.args.value instanceof BaseReport) {
                      draftReport.args.value.swapAxes();
                    }
                  }}
                >
                  Swap X-Y Axes
                </Button>
              ) : undefined}
              <Button type="primary" onClick={onSubmit}>
                {report === undefined ? "Create" : "Update"}
              </Button>
              {report === undefined ? undefined : (
                <Popconfirm
                  title="Are you sure to delete this report?"
                  onConfirm={onDelete}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" danger={true}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          PREVIEW REPORT
        </Typography.Title>
        <Row>
          <Col span={24}>
            <PreviewReportComponent report={draftReport} expId={expId} />
          </Col>
        </Row>
      </Space>
    );
  }
);
