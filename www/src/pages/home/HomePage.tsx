import { makeStyles } from "@mui/styles";
import { Col, Divider, Row, Typography } from "antd";
import { observer } from "mobx-react";
import { useStores } from "models";
import { useEffect, useState } from "react";
import { Activity } from "./Activity";

import { ExperimentExplorer } from "./ExperimentExplorer";
import statsbg_exp from "./statsbg.exp.svg";
import statsbg_run from "./statsbg.run.svg";

const useStyles = makeStyles({
  statCard: {
    opacity: 0.8,
    borderRadius: 6,
    width: "180px",
    height: 80,
    color: "#fff",
    padding: "8px 16px",
    position: "relative",
    "& span": {
      display: "block",
      lineHeight: "normal",
      fontWeight: 400,
      fontSize: 16,
    },
    "& strong": {
      fontWeight: 550,
      lineHeight: "normal",
      fontSize: 36,
    },
  },
  statExpCard: {
    background: "linear-gradient(97.73deg,#8c32af,#6bace5)",
    "&::after": {
      content: `url(${statsbg_exp})`,
      position: "absolute",
      right: 0,
      top: 0,
      opacity: 0.4,
    },
  },
  statRunCard: {
    background: "linear-gradient(98.46deg,#1473e6,#09c6f9)",
    marginTop: 8,
    "&::after": {
      content: `url(${statsbg_run})`,
      position: "absolute",
      right: 0,
      top: 0,
      opacity: 0.4,
    },
  },
});

export const HomePage = observer(() => {
  const classes = useStyles();
  const { expStore, expRunStore } = useStores();
  const [noExps, setNoExps] = useState(0);
  const [noRuns, setNoRuns] = useState(0);

  useEffect(() => {
    expRunStore.fetch({ limit: 1, offset: 0 }).then((res) => {
      setNoRuns(res.total);
    });
  }, []);

  return (
    <>
      <div className="ml-16 mr-16">
        <Row>
          <Col flex="210px">
            <Typography.Title level={2}>Statistics</Typography.Title>
            <div className={classes.statCard + " " + classes.statExpCard}>
              <span>Experiments</span>
              <strong>{noExps}</strong>
            </div>
            <div className={classes.statCard + " " + classes.statRunCard}>
              <span>Runs</span>
              <strong>{noRuns}</strong>
            </div>
          </Col>
          <Col flex="auto">
            <Typography.Title level={2}>Activity</Typography.Title>
            <Activity />
          </Col>
        </Row>
      </div>
      <Divider />
      <div className="ml-16 mr-16">
        <ExperimentExplorer setNoExps={setNoExps} />
      </div>
    </>
  );
});
