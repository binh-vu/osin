import { makeStyles } from "@mui/styles";
import { Divider, Space, Tag, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { TableComponent } from "../../components/TableComponent";
import { Experiment, useStores } from "../../models";
import { routes } from "../../routes";

const useStyles = makeStyles({
  divider: {
    width: "calc(100% + 16px)",
    margin: "12px -8px",
  },
});

export const ExperimentRunPage = observer(() => {
  const classes = useStyles();
  const expId = routes.runs.useURLParams()!.expId;
  const { expStore, expRunStore } = useStores();

  useEffect(() => {
    expStore.fetchById(expId);
  }, [expStore, expId]);

  const exp = expStore.get(expId);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }

  const columns = [];

  return (
    <>
      <Typography.Title level={5} style={{}}>
        RUN EXPLORER
      </Typography.Title>
      <p>
        <Tag color="blue">VERSION {exp.version}</Tag>
        <InternalLink
          path={routes.expSetup}
          urlArgs={{ expId: exp.id }}
          queryArgs={{}}
          style={{ textTransform: "uppercase", fontWeight: 600 }}
        >
          {exp.name}
        </InternalLink>
        : {exp.description}
      </p>

      <Divider className={classes.divider} />

      <TableComponent
        query={async (limit, offset) => {
          let res = await expRunStore.fetchByExp(exp, offset, limit);
          return res;
        }}
        columns={[
          {
            dataIndex: "id",
            title: "Id",
          },
          {
            dataIndex: "createdTime",
            title: "Date",
          },
          {
            dataIndex: "finishedTime",
            title: "Duration",
          },
          {
            dataIndex: "",
            title: "Actions",
            render: ((value: string, record: Experiment) => {
              return (
                <Space size={8}>
                  <InternalLink
                    path={routes.reports}
                    urlArgs={{ expId: record.id }}
                    queryArgs={{}}
                  >
                    Report
                  </InternalLink>
                  <InternalLink
                    path={routes.runs}
                    urlArgs={{ expId: record.id }}
                    queryArgs={{}}
                  >
                    View runs
                  </InternalLink>
                </Space>
              );
            }) as any,
          },
        ]}
      />
    </>
  );
});
