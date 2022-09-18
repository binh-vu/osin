import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { makeStyles } from "@mui/styles";
import { Tabs, Tag, Typography } from "antd";
import { LoadingComponent, NotFoundComponent } from "gena-app";
import humanizeDuration from "humanize-duration";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { useStores } from "../../../models";
import { routes } from "../../../routes";
import { ExampleExplorer } from "./ExampleExplorer";

const useStyles = makeStyles({
  status: {
    marginTop: 2,
  },
  tabs: {
    "& .ant-tabs-nav": {
      paddingLeft: 16,
      boxShadow: "0 0.25rem 0.375rem rgb(144 175 218 / 20%), 0 1px 0 0 #f2f5fa",
      borderTop: ".0625rem solid #f2f5fa",
    },
    "& .ant-tabs-nav::before": {
      borderBottom: "none",
    },
  },
});

const dtFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  second: "numeric",
});
const formatDt = (dt: Date) => {
  const [month, lit1, day, lit2, year, lit3, hour, lit4, minute, lit5, second] =
    dtFormatter.formatToParts(dt);
  return `${day.value} ${month.value} ${year.value}, ${hour.value}:${minute.value}:${second.value}`;
};

export const ExpRunPage = observer(() => {
  const classes = useStyles();
  const runId = routes.run.useURLParams()!.runId;
  const { expStore, expRunStore } = useStores();

  useEffect(() => {
    expRunStore.fetchById(runId).then((exprun) => {
      if (exprun !== undefined) {
        expStore.fetchById(exprun.exp);
      }
    });
  }, [expStore, expRunStore, runId]);

  const exprun = expRunStore.get(runId);
  if (exprun === undefined) {
    return <LoadingComponent />;
  } else if (exprun === null) {
    return <NotFoundComponent />;
  }

  const exp = expStore.get(exprun.exp);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }

  let status = null;

  if (exprun.isSuccessful) {
    status = (
      <Tag
        icon={<CheckCircleOutlined />}
        color="success"
        className={classes.status}
      >
        success
      </Tag>
    );
  } else if (exprun.isFinished) {
    status = (
      <Tag
        icon={<CloseCircleOutlined />}
        color="error"
        className={classes.status}
      >
        error
      </Tag>
    );
  } else {
    status = (
      <Tag
        icon={<SyncOutlined spin={true} />}
        color="processing"
        className={classes.status}
      >
        processing
      </Tag>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexFlow: "row nowrap",
          alignItems: "flex-start",
          alignContent: "center",
          gap: 6,
        }}
      >
        <Typography.Title level={5} className="ml-16">
          {exp.name} / Run: {exprun.id}
        </Typography.Title>
        {status}
      </div>
      <p className="ml-16" style={{ color: "#606986", fontSize: 12 }}>
        <CalendarOutlined /> {formatDt(exprun.createdTime)}&nbsp;•&nbsp;
        {humanizeDuration(
          exprun.finishedTime.getTime() - exprun.createdTime.getTime()
        )}
      </p>

      <Tabs
        className={classes.tabs}
        items={[
          {
            label: "Overview",
            key: "Overview",
            children: <h1>Overview</h1>,
          },
          {
            label: "Parameters",
            key: "Parameters",
            children: <h1>Parameters</h1>,
          },
          {
            label: "Metrics",
            key: "Metrics",
            children: <h1>Parameters</h1>,
          },
          {
            label: "System Metrics",
            key: "System Metrics",
            children: <h1>Parameters</h1>,
          },
          {
            label: "Examples",
            key: "Examples",
            children: <ExampleExplorer />,
          },
        ]}
      />
    </>
  );
});
