import { makeStyles } from "@mui/styles";
import {
  Alert,
  Button,
  Col,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { LoadingComponent } from "gena-app";
import { Filter } from "misc";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import { Experiment, Report, ReportStore, useStores } from "models";
import {
  BaseReport,
  COLUMN_MAX_SIZE,
  DraftCreateReport,
  DraftUpdateReport,
  IndexProperty,
  IndexSchema,
  Position,
  ReportTableArgs,
} from "models/reports";
import {
  IndexSchemaForm,
  ZValueForm,
} from "pages/reports/forms/IndexSchemaForm";
import { useEffect, useMemo } from "react";
import { routes } from "routes";
import { RawAnyIndex } from "./IndexBuilder";

const useStyles = makeStyles({
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
            args: new ReportTableArgs(
              "table",
              new BaseReport(IndexSchema.empty(), IndexSchema.empty(), [])
            ),
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
      <Space direction="vertical" style={{ width: "100%" }}>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Name</Typography.Title>
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
            <Typography.Title level={5}>Description</Typography.Title>
            <Input
              value={draftReport.description}
              onChange={(e) => (draftReport.description = e.target.value)}
              placeholder="enter the report's description"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Type</Typography.Title>
            <Select
              value={"table"}
              style={{ width: "100%" }}
              options={[{ label: "Table", value: "table" }]}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Experiments</Typography.Title>
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
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>X Axis</Typography.Title>
            <IndexSchemaForm index={draftReport.args.value.xaxis} exps={exps} />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Y Axis</Typography.Title>
            <IndexSchemaForm index={draftReport.args.value.yaxis} exps={exps} />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Z Values</Typography.Title>
            <ZValueForm exps={exps} args={draftReport.args.value} />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>
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
      </Space>
    );
  }
);

function upsertReport(
  name: string,
  description: string,
  xaxis: RawAnyIndex[],
  yaxis: RawAnyIndex[],
  zvalues: RawAnyIndex[],
  pos: Position,
  expId: number,
  exps: Experiment[],
  report: Report | undefined,
  reportStore: ReportStore
): Promise<Report | undefined> {
  // if (pos.rowOrder === null || pos.colSpan === null || pos.colOffset === null) {
  return Promise.resolve(undefined);
  // }

  // let newxaxis = new Axis(
  //   xaxis.map((x) => buildIndex(x, "params", exps)).filter(notUndefined)
  // );
  // let newyaxis = new Axis(
  //   yaxis.map((y) => buildIndex(y, "params", exps)).filter(notUndefined)
  // );
  // let newzvalues = zvalues
  //   .map((z) => buildIndex(z, "aggregated_primitive_outputs", exps))
  //   .filter(notUndefined);

  // if (
  //   newxaxis.indices.length !== xaxis.length ||
  //   newyaxis.indices.length !== yaxis.length ||
  //   newzvalues.length !== zvalues.length ||
  //   zvalues.length === 0
  // ) {
  //   // invalid index values
  //   return Promise.resolve(undefined);
  // }

  // const args = {
  //   type: "table" as const,
  //   value: {
  //     xaxis: newxaxis,
  //     yaxis: newyaxis,
  //     zvalues: newzvalues,
  //   },
  // };
  // if (report === undefined) {
  //   return reportStore.create({
  //     name,
  //     description,
  //     args,
  //     exp: expId,
  //     exps: exps.map((e) => e.id),
  //     position: pos,
  //   });
  // } else {
  //   return reportStore.update({
  //     id: report.id,
  //     name,
  //     description,
  //     args,
  //     exp: expId,
  //     exps: exps.map((e) => e.id),
  //     position: pos,
  //   });
  // }
}

function buildIndex(
  index: RawAnyIndex,
  property: IndexProperty,
  exps: Experiment[]
): any | undefined {
  return undefined;
  // if (
  //   (index.isExp && index.expindex === undefined) ||
  //   (!index.isExp && index.index === undefined)
  // ) {
  //   return undefined;
  // }

  // if (!index.isExp) {
  //   if (index.index! === EXPNAME_INDEX_FIELD) {
  //     if (index.values !== undefined) {
  //       let selectedExpNames = new Set(index.values);
  //       exps = exps.filter((e) => selectedExpNames.has(e.name));
  //     }

  //     return new ExpIndex(
  //       Object.fromEntries(exps.map((exp) => [exp.id, EXPNAME_INDEX_FIELD])),
  //       null
  //     );
  //   }
  //   return new Index(index.index!.split("."), index.values || null, property);
  // }

  // return new ExpIndex(
  //   Object.fromEntries(
  //     Object.entries(index.expindex!).map(([expid, expindex]) => {
  //       return [
  //         parseInt(expid),
  //         new Index(expindex.split("."), null, property),
  //       ];
  //     })
  //   ),
  //   Object.keys(index.expvalues).length === 0 ? null : index.expvalues
  // );
}

function getRawIndices(exps: Experiment[], indices: any[]): RawAnyIndex[] {
  return [];
  // return indices.map((index) => {
  //   if (index instanceof Index) {
  //     return {
  //       isExp: false,
  //       index: index.index.join("."),
  //       values: index.values === null ? undefined : index.values,
  //     };
  //   } else {
  //     const indices = Object.entries(index.indices);
  //     const tmp = indices
  //       .map(([key, val]) => (val === EXPNAME_INDEX_FIELD ? 1 : 0))
  //       .reduce((a: number, b) => a + b, 0);
  //     if (tmp > 0) {
  //       if (tmp !== indices.length) {
  //         throw new Error(
  //           "The UI does not support mixed exp index for now. This should not reachable for report created through the UI."
  //         );
  //       }

  //       // all exp indices are EXPNAME_INDEX_FIELD
  //       return {
  //         isExp: false,
  //         index: EXPNAME_INDEX_FIELD,
  //         // use all values if all exp are used
  //         values:
  //           indices.length === exps.length
  //             ? undefined
  //             : indices.map(([key, val]) => key),
  //       };
  //     }

  //     return {
  //       isExp: true,
  //       expindex: Object.fromEntries(
  //         indices.map(([key, val]) => [key, (val as Index).index.join(".")])
  //       ),
  //       expvalues: index.values === null ? {} : index.values,
  //       expvalueOptions: {},
  //     };
  //   }
  // });
}

function notUndefined<V>(v: V | undefined): v is V {
  return v !== undefined;
}
