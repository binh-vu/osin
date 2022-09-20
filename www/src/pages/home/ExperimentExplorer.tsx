import { makeStyles } from "@mui/styles";
import { Card, Col, Row, Tag } from "antd";
import { InternalLink } from "gena-app";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { useStores } from "../../models";
import { routes } from "../../routes";

const useStyles = makeStyles({
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
});

export const ExperimentExplorer = observer(
  ({ setNoExps }: { setNoExps: (n: number) => void }) => {
    const classes = useStyles();
    const { expStore } = useStores();

    useEffect(() => {
      expStore.fetch({ limit: 1000, offset: 0 }).then((res) => {
        setNoExps(res.total);
      });
    }, [expStore]);

    let grid: JSX.Element[] = [];
    let row: JSX.Element[] = [];
    const nColumns = 4;

    expStore.records.forEach((exp) => {
      if (exp === null) return;

      row.push(
        <Col className="gutter-row" span={6} key={exp.id}>
          <Card
            className={classes.card}
            actions={[
              <InternalLink
                path={routes.reports}
                urlArgs={{ expId: exp.id }}
                queryArgs={{}}
              >
                Report
              </InternalLink>,
              <InternalLink
                path={routes.runs}
                urlArgs={{ expId: exp.id }}
                queryArgs={{}}
              >
                View runs
              </InternalLink>,
            ]}
            extra={<Tag color="blue">VERSION {exp.version}</Tag>}
            title={exp.name}
            size="small"
          >
            <span>{exp.description}</span>
          </Card>
        </Col>
      );

      if (row.length === nColumns) {
        grid.push(
          <Row gutter={16} key={grid.length}>
            {row}
          </Row>
        );
        row = [];
      }
    });

    if (row.length > 0) {
      grid.push(
        <Row gutter={16} key={grid.length}>
          {row}
        </Row>
      );
    }

    return <>{grid}</>;
  }
);
