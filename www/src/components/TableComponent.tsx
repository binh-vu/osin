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
  fullWidthTable: {
    "& .ant-pro-card-body": {
      paddingLeft: 0,
      paddingRight: 0,
    },
    "& table": {
      borderRadius: 0,
    },
  },
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
  selectRows?: boolean;
  fullWidth?: boolean;
  scroll?: { x?: number | string | true; y?: number | string };
}

export const TableComponent = observer(
  forwardRef(
    (
      {
        defaultPageSize = 10,
        query,
        toolBarRender,
        showRowIndex = false,
        selectRows = false,
        columns,
        fullWidth = true,
        scroll,
      }: TableComponentProps,
      ref
    ) => {
      const classes = useStyles();
      const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
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
          rowSelection={
            selectRows
              ? { selectedRowKeys, onChange: setSelectedRowKeys }
              : undefined
          }
          tableAlertRender={false} // hide the alert when select rows for now.
          scroll={scroll}
          actionRef={actionRef}
          className={
            classes.table + " " + (fullWidth ? classes.fullWidthTable : "")
          }
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
