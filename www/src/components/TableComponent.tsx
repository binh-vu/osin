import { SearchOutlined } from "@ant-design/icons";
import ProTable, { ActionType, ProColumns } from "@ant-design/pro-table";
import { makeStyles } from "@mui/styles";
import { Descriptions, Tag, Typography } from "antd";
import { ExpandableConfig } from "antd/lib/table/interface";
import { ExternalLink } from "gena-app";
import humanizeDuration from "humanize-duration";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { observer } from "mobx-react";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { green, red } from "@ant-design/colors";

export const useStyles = makeStyles({
  table: {
    "& .ant-table": {
      // having this issue with PyObjectTable that somehow margin is -8
      margin: "0px !important",
    },
  },
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
  expandable?: ExpandableConfig<any>;
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
        expandable,
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
          expandable={expandable}
        />
      );
    }
  )
);

const dtFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  second: "numeric",
});

export const Render = {
  str: (text: any) => text.toString(),
  boolFmt1: (value: boolean) =>
    value ? (
      <CheckCircleFilled style={{ color: green[6] }} />
    ) : (
      <CloseCircleFilled style={{ color: red[6] }} />
    ),
  boolFmt2: (value: boolean) =>
    value ? <Tag color="success">true</Tag> : <Tag color="error">false</Tag>,
  boolFmt3Reverse: (value: boolean) =>
    value ? <Tag color="error">yes</Tag> : <Tag color="success">no</Tag>,
  number: (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 3 }),
  datetimeFmt1: (dt: Date) => {
    // time first
    const [
      month,
      lit1,
      day,
      lit2,
      year,
      lit3,
      hour,
      lit4,
      minute,
      lit5,
      second,
    ] = dtFormatter.formatToParts(dt);
    return `${hour.value}:${minute.value}:${second.value} · ${day.value} ${month.value}, ${year.value}`;
  },
  duration: (ms: number) => {
    return humanizeDuration(ms);
  },
  auto: (value: any) => {
    if (typeof value === "number") {
      return Render.number(value);
    }
    if (typeof value === "boolean") {
      return Render.boolFmt2(value);
    }
    return Render.str(value);
  },
};
