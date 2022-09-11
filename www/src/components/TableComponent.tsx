import { SearchOutlined } from "@ant-design/icons";
import ProTable, { ActionType, ProColumns } from "@ant-design/pro-table";
import { makeStyles } from "@mui/styles";
import { Descriptions, Tag, Typography } from "antd";
import { ExternalLink } from "gena-app";
import { observer } from "mobx-react";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export const useStyles = makeStyles({
  table: {},
});

export interface TableComponentFunc {
  reload: () => void;
}

interface TableComponentProps {
  defaultPageSize?: number;
  query: (
    limit: number,
    offset: number
  ) => Promise<{ records: any[]; total: number }>;
  toolBarRender?: false;
  showRowIndex?: boolean;
  columns: ProColumns[];
}

export const TableComponent = observer(
  forwardRef(
    (
      {
        defaultPageSize = 10,
        query,
        toolBarRender,
        showRowIndex = false,
        columns,
      }: TableComponentProps,
      ref
    ) => {
      const classes = useStyles();
      const actionRef = useRef<ActionType>();

      useImperativeHandle(
        ref,
        (): TableComponentFunc => ({
          reload: () => {
            actionRef.current?.reload();
          },
        })
      );

      if (showRowIndex) {
        columns.splice(0, 0, {
          title: (
            <Typography.Text type="secondary" disabled={true}>
              #
            </Typography.Text>
          ),
          dataIndex: "id",
        } as any);
      }

      return (
        <ProTable
          actionRef={actionRef}
          className={classes.table}
          defaultSize="small"
          bordered={true}
          request={async (params, sort, filter) => {
            const { records, total } = await query(
              params.pageSize!,
              (params.current! - 1) * params.pageSize!
            );
            return {
              data: records,
              success: true,
              total,
            };
          }}
          search={false}
          pagination={{
            pageSize: defaultPageSize,
            pageSizeOptions: [
              "5",
              "10",
              "20",
              "50",
              "100",
              "200",
              "500",
              "1000",
            ],
          }}
          toolBarRender={toolBarRender}
          rowKey="id"
          columns={columns}
        />
      );
    }
  )
);
