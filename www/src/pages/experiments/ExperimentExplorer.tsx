import { Space, Typography } from "antd";
import { InternalLink } from "gena-app";
import { observer } from "mobx-react";
import React from "react";
import { Experiment, useStores } from "../../models";
import { routes } from "../../routes";

import { TableComponent } from "../../components/TableComponent";

export const ExperimentExplorer = observer(() => {
  const { expStore } = useStores();

  return (
    <>
      <Typography.Title level={1}>Experiments</Typography.Title>
      <TableComponent
        query={async (limit, offset) => {
          let res = await expStore.fetch({ limit, offset });
          return res;
        }}
        columns={[
          {
            dataIndex: "name",
            title: "Name",
          },
          {
            dataIndex: "version",
            title: "Version",
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
