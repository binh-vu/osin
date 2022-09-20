import { makeStyles } from "@mui/styles";
import { Card, Col, Row, Table, Typography } from "antd";
import { Render } from "components/TableComponent";
import { ExperimentRun } from "models";
import { useEffect } from "react";

const useStyles = makeStyles({
  card: {
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: 16,
  },
});

const columns = [
  {
    title: "Name",
    dataIndex: "name",
    render: Render.str,
  },
  {
    title: "Value",
    dataIndex: "value",
    render: Render.auto,
  },
];

export const ExpRunOverview = ({ expRun }: { expRun: ExperimentRun }) => {
  const classes = useStyles();

  useEffect(() => {
    // expRun.params;
  }, [expRun.id]);
  return (
    <div className="ml-16 mr-16">
      <Row gutter={16}>
        <Col className="gutter-row" span={18}>
          <div className={classes.card}>
            <Typography.Title level={2}>Run Parameters</Typography.Title>
            <Table
              columns={columns}
              dataSource={[]}
              size="middle"
              scroll={{ y: 480 }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};
