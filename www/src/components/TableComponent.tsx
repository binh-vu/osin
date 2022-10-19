import { green, red } from "@ant-design/colors";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import ProTable, { ActionType, ProColumns } from "@ant-design/pro-table";
import { makeStyles } from "@mui/styles";
import { Tag, Typography } from "antd";
import { ExpandableConfig, SortOrder } from "antd/lib/table/interface";
import humanizeDuration from "humanize-duration";
import { observer } from "mobx-react";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

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
    offset: number,
    sort: Record<string, SortOrder>
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
          request={async (params, sort: Record<string, SortOrder>, filter) => {
            const { records, total } = await query(
              params.pageSize!,
              (params.current! - 1) * params.pageSize!,
              sort
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
export const dtFormatToParts = (dt: Date, formatter?: Intl.DateTimeFormat) => {
  const [
    month,
    _lit1,
    day,
    _lit2,
    year,
    _lit3,
    hour,
    _lit4,
    minute,
    _lit5,
    second,
  ] = (formatter || dtFormatter).formatToParts(dt);

  return {
    month: month.value,
    day: day.value,
    year: year.value,
    hour: hour.value,
    minute: minute.value,
    second: second.value,
  };
};

export const Render = {
  str: (text: any) => {
    if (text === null || text === undefined) {
      return "";
    }
    return text.toString();
  },
  strMonospace: (text: any) => {
    if (text === null || text === undefined) {
      return "";
    }
    return <Typography.Text code={true}>{text.toString()}</Typography.Text>;
  },
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
    const p = dtFormatToParts(dt);
    return `${p.hour}:${p.minute}:${p.second} · ${p.day} ${p.month}, ${p.year}`;
  },
  datetimeFmt2: (dt: Date) => {
    const p = dtFormatToParts(dt);
    return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}:${p.second}`;
  },
  duration: (ms: number | undefined | null | "-") => {
    if (ms === undefined || ms === null || ms === "-") {
      return "-";
    }
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
