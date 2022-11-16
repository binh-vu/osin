import { makeStyles } from "@mui/styles";
import { Card, Col, Dropdown, Row, Tag } from "antd";
import { InternalLink } from "gena-app";
import { observer } from "mobx-react";
import { useEffect, useMemo, useState } from "react";
import { Experiment, useStores } from "models";
import { routes } from "routes";
import { unstable_batchedUpdates } from "react-dom";

const useStyles = makeStyles({
  card: {
    border: "1px solid #ddd",
    borderRadius: 4,
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
  row: {
    marginBottom: 16,
  },
});

export const ExperimentExplorer = observer(
  ({ setNoExps }: { setNoExps: (n: number) => void }) => {
    const classes = useStyles();
    const { expStore } = useStores();
    const [groupedExps, setGroupedExps] = useState<{
      [name: string]: Experiment[];
    }>({});
    const [selectedVersion, setSelectedVersion] = useState<{
      [name: string]: number;
    }>({});

    useEffect(() => {
      expStore.fetchAllExperiments().then(() => {
        const groupedExps = expStore.groupExperimentsByName();
        const selectedVersion = Object.values(
          expStore.groupExperimentsByName()
        ).map((e) => {
          return [e[0].name, e[0].version];
        });

        unstable_batchedUpdates(() => {
          setNoExps(selectedVersion.length);
          setSelectedVersion(Object.fromEntries(selectedVersion));
          setGroupedExps(groupedExps);
        });
      });
    }, [expStore]);

    let grid: JSX.Element[] = [];
    let row: JSX.Element[] = [];
    const nColumns = 4;

    Object.values(groupedExps).forEach((exps) => {
      let version = selectedVersion[exps[0].name];
      let exp = exps.filter((e) => e.version === version)[0];
      let versions;

      if (exps.length > 1) {
        versions = (
          <Dropdown
            menu={{
              items: exps.map((e) => ({
                label: `VERSION ${e.version}`,
                key: `${e.id}`,
              })),
              onClick: (e) => {
                let version = expStore.get(parseInt(e.key))!.version;
                setSelectedVersion(
                  Object.assign({}, selectedVersion, { [exp.name]: version })
                );
              },
            }}
          >
            <Tag color="blue">VERSION {version}</Tag>
          </Dropdown>
        );
      } else {
        versions = <Tag color="blue">VERSION {version}</Tag>;
      }

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
            extra={versions}
            title={exp.name}
            size="small"
          >
            <span>{exp.description}</span>
          </Card>
        </Col>
      );

      if (row.length === nColumns) {
        grid.push(
          <Row gutter={16} key={grid.length} className={classes.row}>
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
