import { makeStyles } from "@mui/styles";
import { Col, Row, Space, Table, Typography } from "antd";
import { dtFormatToParts, Render } from "components/TableComponent";
import { InfoCard } from "components/cards/InfoCard";
import { ExperimentRun, NestedPrimitiveDataSchema } from "models";
import { useEffect, useState } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
} from "@ant-design/icons";
import { faHourglass } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const useStyles = makeStyles({
  card: {
    border: "1px solid #ddd",
    borderRadius: 4,
    padding: 16,
  },
  borderlessCard: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  column2nd: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  infoList: {
    "& > i": {
      minWidth: 24,
      display: "inline-block",
    },
  },
});

const columns = [
  {
    title: "Name",
    dataIndex: "key",
    render: Render.strMonospace,
  },
  {
    title: "Value",
    dataIndex: "value",
    render: Render.auto,
  },
];

const dtFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  second: "numeric",
});

export const ExpRunOverview = ({ expRun }: { expRun: ExperimentRun }) => {
  const classes = useStyles();
  const [params, setParams] = useState<Record<string, any>[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    setParams(NestedPrimitiveDataSchema.flatten(expRun.params));
    setMetrics(
      NestedPrimitiveDataSchema.flatten(expRun.data.aggregated.primitive)
    );
  }, [expRun.id]);

  const p = dtFormatToParts(expRun.createdTime, dtFormatter);
  const createdDate = `${p.day} ${p.month} ${p.year}`;
  const createdTime = `${p.hour}:${p.minute}:${p.second}`;
  const duration = Render.duration(expRun.duration);

  return (
    <div className="ml-16 mr-16">
      <Row gutter={16}>
        <Col className="gutter-row" span={18}>
          <InfoCard title="Run Parameters">
            <Table
              columns={columns}
              dataSource={params}
              size="middle"
              scroll={{ y: 480 }}
              pagination={false}
            />
          </InfoCard>
          <InfoCard title="Metrics">
            <Table
              columns={columns}
              dataSource={metrics}
              size="middle"
              scroll={{ y: 480 }}
              pagination={false}
            />
          </InfoCard>
        </Col>
        <Col className="gutter-row" span={6}>
          <InfoCard
            title="Information"
            className={classes.column2nd}
            bordered={false}
          >
            <Space direction="vertical">
              <div className={classes.infoList}>
                <i>
                  <CalendarOutlined />
                </i>{" "}
                {createdDate}
              </div>
              <div className={classes.infoList}>
                <i>
                  <ClockCircleOutlined />
                </i>{" "}
                {createdTime}
              </div>
              <div className={classes.infoList}>
                <i>
                  <FontAwesomeIcon icon={faHourglass} style={{ width: 14 }} />
                </i>{" "}
                {duration}
              </div>
            </Space>
          </InfoCard>
        </Col>
      </Row>
    </div>
  );
};
