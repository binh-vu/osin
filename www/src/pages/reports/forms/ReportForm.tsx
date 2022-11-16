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
import { LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { Experiment, Report, ReportStore, useStores } from "models";
import { ParamSchema } from "models/experiments";
import {
  Axis,
  COLUMN_MAX_SIZE,
  ExpIndex,
  EXPNAME_INDEX_FIELD,
  Index,
  IndexProperty,
  Position,
} from "models/reports";
import { useEffect, useMemo, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { routes } from "routes";
import { MultiLevelIndexBuilder, RawAnyIndex } from "./IndexBuilder";

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
    const [exps, setExps] = useState<Experiment[]>([]);
    const [name, setName] = useState(report === undefined ? "" : report.name);
    const [description, setDescription] = useState(
      report === undefined ? "" : report.description
    );
    const [xaxis, setXAxis] = useState<RawAnyIndex[]>([{ isExp: false }]);
    const [yaxis, setYAxis] = useState<RawAnyIndex[]>([{ isExp: false }]);
    const [zvalues, setZValues] = useState<RawAnyIndex[]>([]);
    const [pos, setPos] = useState<Position>({
      rowOrder: 0,
      colSpan: 24,
      colOffset: 0,
    });

    useEffect(() => {
      // fetch all experiments cause we haven't implement the search by name yet
      expStore.fetchAllExperiments().then(() => {
        if (report === undefined) {
          setExps([expStore.get(expId)!]);
        } else {
          expReportStore.fetchByReportId(report.id, 1000, 0).then(() => {
            const lst = expReportStore.getExperimentsByReportId(report.id);
            const exps = lst.map(([expreport, exp]) => exp);
            const expreports = lst.filter(
              ([expreport, exp]) => exp.id === expId
            );

            unstable_batchedUpdates(() => {
              if (
                expreports.length > 0 &&
                expreports[0][0].position !== undefined
              ) {
                setPos(expreports[0][0].position);
              }

              setExps(exps);
              setXAxis(getRawIndices(exps, report.args.value.xaxis.indices));
              setYAxis(getRawIndices(exps, report.args.value.yaxis.indices));
              setZValues(getRawIndices(exps, report.args.value.zvalues));
            });
          });
        }
      });
    }, [expStore, expId, report === undefined ? undefined : report.id]);

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

    // change selected experiments
    const updateSelectedExperiments = (values: number[]) => {
      if (values.indexOf(expId) === -1) {
        values.splice(0, 0, expId);
      }
      setExps(values.map((id) => expStore.get(id)!));
    };

    const onSubmit = () => {
      upsertReport(
        name,
        description,
        xaxis,
        yaxis,
        zvalues,
        pos,
        expId,
        exps,
        report,
        reportStore
      );
    };

    const onDelete = () => {
      reportStore.delete(report!.id).then(() => {
        routes.reports.path({ expId: expId }).open();
      });
    };

    // position status
    let posstatus = "";
    let posmsg = undefined;
    if (pos.colSpan === null) {
      posstatus = "span";
      posmsg = "span must be an integer between 1 and 24";
    } else if (pos.colOffset === null) {
      posstatus = "leftoffset";
      posmsg = "left offset must be an integer between 0 and 23";
    } else if (pos.colSpan + pos.colOffset > COLUMN_MAX_SIZE) {
      posstatus = "span";
      posmsg = `span + offset must be less than or equal to ${COLUMN_MAX_SIZE}`;
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Name</Typography.Title>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="enter the report's name"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Description</Typography.Title>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              value={exps.map((e) => e.id)}
              onChange={updateSelectedExperiments}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>X Axis</Typography.Title>
            <MultiLevelIndexBuilder
              exps={exps}
              indices={xaxis}
              setIndices={setXAxis}
              property="params"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Y Axis</Typography.Title>
            <MultiLevelIndexBuilder
              exps={exps}
              indices={yaxis}
              setIndices={setYAxis}
              property="params"
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>Z Values</Typography.Title>
            <MultiLevelIndexBuilder
              exps={exps}
              indices={zvalues}
              setIndices={setZValues}
              property="aggregated_primitive_outputs"
              isZValues={true}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5}>
              <Space direction="horizontal">
                Positions
                <InputNumber
                  addonBefore="row"
                  value={pos.rowOrder}
                  size="large"
                  onChange={(value) => setPos({ ...pos, rowOrder: value! })}
                />
                <InputNumber
                  addonBefore="span"
                  min={1}
                  max={COLUMN_MAX_SIZE}
                  value={pos.colSpan}
                  size="large"
                  status={
                    posstatus === "span" || posstatus === "all" ? "error" : ""
                  }
                  onChange={(value) => setPos({ ...pos, colSpan: value! })}
                />
                <InputNumber
                  addonBefore="offset"
                  min={0}
                  max={COLUMN_MAX_SIZE - 1}
                  value={pos.colOffset}
                  status={
                    posstatus === "leftoffset" || posstatus === "all"
                      ? "error"
                      : ""
                  }
                  size="large"
                  onChange={(value) => setPos({ ...pos, colOffset: value! })}
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
) {
  if (pos.rowOrder === null || pos.colSpan === null || pos.colOffset === null) {
    return;
  }

  let newxaxis = new Axis(
    xaxis.map((x) => buildIndex(x, "params", exps)).filter(notUndefined)
  );
  let newyaxis = new Axis(
    yaxis.map((y) => buildIndex(y, "params", exps)).filter(notUndefined)
  );
  let newzvalues = zvalues
    .map((z) => buildIndex(z, "aggregated_primitive_outputs", exps))
    .filter(notUndefined);

  if (
    newxaxis.indices.length !== xaxis.length ||
    newyaxis.indices.length !== yaxis.length ||
    newzvalues.length !== zvalues.length ||
    zvalues.length === 0
  ) {
    // invalid index values
    return;
  }

  const args = {
    type: "table" as const,
    value: {
      xaxis: newxaxis,
      yaxis: newyaxis,
      zvalues: newzvalues,
    },
  };
  if (report === undefined) {
    reportStore.create({
      name,
      description,
      args,
      exp: expId,
      exps: exps.map((e) => e.id),
      position: pos,
    });
  } else {
    reportStore.update({
      id: report.id,
      name,
      description,
      args,
      exp: expId,
      exps: exps.map((e) => e.id),
      position: pos,
    });
  }
}

function buildIndex(
  index: RawAnyIndex,
  property: IndexProperty,
  exps: Experiment[]
): Index | ExpIndex | undefined {
  if (
    (index.isExp && index.expindex === undefined) ||
    (!index.isExp && index.index === undefined)
  ) {
    return undefined;
  }

  if (!index.isExp) {
    if (index.index! === EXPNAME_INDEX_FIELD) {
      if (index.values !== undefined) {
        let selectedExpNames = new Set(index.values);
        exps = exps.filter((e) => selectedExpNames.has(e.name));
      }

      return new ExpIndex(
        Object.fromEntries(exps.map((exp) => [exp.id, EXPNAME_INDEX_FIELD])),
        null
      );
    }
    return new Index(index.index!.split("."), index.values || null, property);
  }

  return new ExpIndex(
    Object.fromEntries(
      Object.entries(index.expindex!).map(([expid, expindex]) => {
        return [
          parseInt(expid),
          new Index(expindex.split("."), null, property),
        ];
      })
    ),
    Object.keys(index.expvalues).length == 0 ? null : index.expvalues
  );
}

function getRawIndices(
  exps: Experiment[],
  indices: (Index | ExpIndex)[]
): RawAnyIndex[] {
  return indices.map((index) => {
    if (index instanceof Index) {
      return {
        isExp: false,
        index: index.index.join("."),
        values: index.values === null ? undefined : index.values,
      };
    } else {
      const indices = Object.entries(index.indices);
      const tmp = indices
        .map(([key, val]) => (val === EXPNAME_INDEX_FIELD ? 1 : 0))
        .reduce((a: number, b) => a + b, 0);
      if (tmp > 0) {
        if (tmp !== indices.length) {
          throw new Error(
            "The UI does not support mixed exp index for now. This should not reachable for report created through the UI."
          );
        }

        // all exp indices are EXPNAME_INDEX_FIELD
        return {
          isExp: false,
          index: EXPNAME_INDEX_FIELD,
          // use all values if all exp are used
          values:
            indices.length === exps.length
              ? undefined
              : indices.map(([key, val]) => key),
        };
      }

      return {
        isExp: true,
        expindex: Object.fromEntries(
          indices.map(([key, val]) => [key, (val as Index).index.join(".")])
        ),
        expvalues: index.values === null ? {} : index.values,
        expvalueOptions: {},
      };
    }
  });
}

function notUndefined<V>(v: V | undefined): v is V {
  return v !== undefined;
}
