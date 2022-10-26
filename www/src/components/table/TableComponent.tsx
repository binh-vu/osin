import { green, red } from "@ant-design/colors";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { makeStyles } from "@mui/styles";
import { Skeleton, Table, Tag, Typography } from "antd";
import {
  ColumnGroupType,
  ColumnsType,
  ColumnType,
  ExpandableConfig,
  FilterValue,
  SorterResult,
  TablePaginationConfig,
} from "antd/lib/table/interface";
import { QueryConditions } from "gena-app";
import humanizeDuration from "humanize-duration";
import { getClassName } from "misc";
import { observer } from "mobx-react";
import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { ColumnConfig, TableColumn, TableColumnIndex } from "./Columns";
import { TableToolbar } from "./TableToolBar";

export const useStyles = makeStyles({
  table: {
    "& .ant-table": {
      // having this issue with PyObjectTable that somehow margin is -8
      margin: "0px !important",
    },
    "& li.ant-pagination-options": {
      marginRight: 8,
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

export interface TableComponentFunc<R> {
  reload: () => void;
  changeTableSize: (size: "small" | "middle" | "large") => void;
  currentTableSize: () => "small" | "middle" | "large";
  columns: () => ColumnsType<R>;
  internalColumns: () => TableColumnIndex<R>;
  setInternalColumns: (columns: TableColumnIndex<R>) => void;
  resetInternalColumns: (fromSaveState: boolean) => void;
  saveInternalColumns: () => void;
}

interface TableComponentProps<R> {
  defaultPageSize?: number;
  defaultShowPageSizeChanger?: boolean;
  defaultTableSize?: "small" | "middle" | "large";
  query: (
    limit: number,
    offset: number,
    conditions: QueryConditions<R>,
    sort: {
      field: keyof R;
      order: "desc" | "asc";
    }[]
  ) => Promise<{ records: R[]; total: number }>;
  toolbar?: React.ReactElement | object;
  showRowIndex?: boolean;
  columns: TableColumn<R>[];
  selectRows?: boolean;
  fullWidth?: boolean;
  scroll?: { x?: number | string | true; y?: number | string };
  expandable?: ExpandableConfig<any>;
  saveColumnState?: (cfgs: ColumnConfig[]) => void;
  restoreColumnState?: () => Promise<ColumnConfig[]>;
}

export const TableComponent_ = <R extends object>(
  {
    defaultPageSize = 5,
    defaultShowPageSizeChanger = true,
    defaultTableSize = "small",
    query,
    toolbar,
    showRowIndex = false,
    selectRows = false,
    columns,
    fullWidth = true,
    scroll,
    expandable,
    saveColumnState,
    restoreColumnState,
  }: TableComponentProps<R>,
  ref: ForwardedRef<TableComponentFunc<R>>
) => {
  const classes = useStyles();
  const [data, setData] = useState<R[]>([]);
  const [sorter, setSorter] = useState<SorterResult<R>[]>([]);
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>(
    {}
  );
  const [tableSize, setTableSize] = useState<"small" | "middle" | "large">(
    defaultTableSize
  );
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    total: 0,
    current: 1,
    showTotal: (total) => `Total ${total} items`,
    pageSize: defaultPageSize,
    showSizeChanger: defaultShowPageSizeChanger,
    pageSizeOptions: ["5", "10", "20", "50", "100", "200", "500", "1000"],
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [internalColumns, setInternalColumns] = useState<
    TableColumnIndex<R> | undefined
  >(undefined);

  const func: TableComponentFunc<R> = {
    reload: () => {
      onRequestData(pagination, filters, sorter);
    },
    changeTableSize: (size: "small" | "middle" | "large") => {
      setTableSize(size);
    },
    currentTableSize: () => tableSize,
    columns: () => columns,
    internalColumns: () =>
      internalColumns === undefined
        ? TableColumnIndex.fromNestedColumns([])
        : internalColumns,
    setInternalColumns,
    resetInternalColumns: (fromSaveState: boolean) => {
      let item = TableColumnIndex.fromNestedColumns(columns);
      if (fromSaveState && restoreColumnState !== undefined) {
        restoreColumnState().then((cfgs) => {
          if (cfgs.length > 0) {
            item = item.restoreChanges(cfgs);
          }
          setInternalColumns(item);
        });
      } else {
        setInternalColumns(item);
      }
    },
    saveInternalColumns: () => {
      if (internalColumns !== undefined && saveColumnState !== undefined) {
        saveColumnState(internalColumns.getChanges());
      }
    },
  };

  // handling the columns here
  useEffect(() => {
    func.resetInternalColumns(true);
  }, [columns]);

  const columns_ = useMemo(() => {
    return internalColumns === undefined
      ? undefined
      : internalColumns.getAntdColumns();
  }, [internalColumns]);

  // handling table data fetching
  const onRequestData = (
    paging: TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<R>[]
    // extra: TableCurrentDataSource<R>
  ) => {
    // console.log("on request", { paging, filters, sorter });
    let limit = paging.pageSize!;
    let offset = (paging.current! - 1) * limit;

    let sortedBy = [];
    for (const item of sorter) {
      if (item.field !== undefined && item.order !== undefined) {
        sortedBy.push({
          field: item.field as keyof R,
          order: (item.order === "ascend" ? "asc" : "desc") as "asc" | "desc",
        });
      }
    }

    let conditions: QueryConditions<R> = {};
    for (const key in filters) {
      const value = filters[key];
      if (value !== null && value.length > 0) {
        if (value.length === 1) {
          conditions[key as keyof R] = value[0];
        } else {
          conditions[key as keyof R] = { op: "in", value: value as any };
        }
      }
    }

    query(limit, offset, conditions, sortedBy).then(({ records, total }) => {
      setData(records);
      setPagination({ ...paging, total });
    });
  };
  useImperativeHandle(ref, () => func);

  // fetch the data for the first time
  useEffect(() => {
    // get the default sortedBy
    let sorter = getDefaultSorter(columns);
    setSorter(sorter);
    let filters = getDefaultFilters(columns);
    setFilters(filters);
    onRequestData(pagination, filters, sorter);
  }, []);

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

  let toolbarel;
  if (toolbar !== undefined && !React.isValidElement(toolbar)) {
    toolbarel = <TableToolbar {...toolbar} table={func} />;
  } else {
    toolbarel = toolbar;
  }

  if (columns_ === undefined) return <Skeleton loading={true} active={true} />;

  return (
    <>
      {toolbarel}
      <Table
        rowSelection={
          selectRows
            ? { selectedRowKeys, onChange: setSelectedRowKeys }
            : undefined
        }
        scroll={scroll}
        className={getClassName(classes.table, [
          fullWidth,
          classes.fullWidthTable,
        ])}
        size={tableSize}
        bordered={true}
        dataSource={data}
        pagination={pagination}
        rowKey="id"
        columns={columns_}
        expandable={expandable}
        onChange={(
          antd_paging,
          antd_filters,
          antd_sorter: SorterResult<R> | SorterResult<R>[]
        ) => {
          if (!Array.isArray(antd_sorter)) {
            antd_sorter = [antd_sorter];
          }

          // we have a small issue where if the columns containing the sorters or filters
          // are hidden, they won't be included in the sorter or filters, so we need to
          // add them back
          imputeMissingSorter_(antd_sorter, sorter);
          imputeMissingFilters_(antd_filters, filters);

          setSorter(antd_sorter);
          setFilters(antd_filters);
          onRequestData(antd_paging, antd_filters, antd_sorter);
        }}
      />
    </>
  );
};

/** Get default sorter of AntD Table from its columns */
const getDefaultSorter = <R extends object>(
  columns: ColumnType<R>[]
): SorterResult<R>[] => {
  return columns
    .filter((col) => col.sorter && col.defaultSortOrder !== undefined)
    .map((col) => {
      let field;
      if (Array.isArray(col.dataIndex)) {
        field = col.dataIndex.join(".");
      } else {
        field = col.dataIndex;
      }
      let order = col.defaultSortOrder;
      return { field, order };
    });
};

/** Add missing sorters due to hidden columns */
const imputeMissingSorter_ = <R extends object>(
  sorter: SorterResult<R>[],
  currentSorter: SorterResult<R>[]
) => {
  let currentFields = new Set(sorter.map((item) => item.field));
  for (const item of currentSorter) {
    if (!currentFields.has(item.field)) {
      sorter.push(item);
    }
  }
};

/** Get default filters of AntD Table from its columns */
const getDefaultFilters = <R extends object>(
  columns: ColumnType<R>[]
): Record<string, FilterValue | null> => {
  return Object.fromEntries(
    columns
      .filter((col) => col.defaultFilteredValue !== undefined)
      .map((col) => {
        let field;
        if (Array.isArray(col.dataIndex)) {
          field = col.dataIndex.join(".");
        } else {
          field = col.dataIndex;
        }

        return [field, col.defaultFilteredValue];
      })
  );
};

/** Add missing filters due to hidden columns */
const imputeMissingFilters_ = <R extends object>(
  filters: Record<string, FilterValue | null>,
  currentFilters: Record<string, FilterValue | null>
) => {
  for (const key in currentFilters) {
    if (filters[key] === undefined) {
      filters[key] = currentFilters[key];
    }
  }
};

const TableComponentFR_ =
  (forwardRef(TableComponent_) as <R>(
    props: TableComponentProps<R>,
    ref: React.ForwardedRef<TableComponentFunc<R>>
  ) => React.ReactElement) || null;
export const TableComponent = observer(TableComponentFR_);

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

export const EmptyToken = "";

export const Render = {
  str: (text: any) => {
    if (text === null || text === undefined) {
      return EmptyToken;
    }
    return text.toString();
  },
  strMonospace: (text: any) => {
    if (text === null || text === undefined) {
      return EmptyToken;
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
  number: (value: number | null | undefined) => {
    if (value === undefined || value === null) {
      return EmptyToken;
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 3 });
  },
  datetimeFmt1: (dt: Date) => {
    // time first
    const p = dtFormatToParts(dt);
    return `${p.hour}:${p.minute}:${p.second} · ${p.day} ${p.month}, ${p.year}`;
  },
  datetimeFmt2: (dt: Date) => {
    const p = dtFormatToParts(dt);
    return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}:${p.second}`;
  },
  duration: (ms: number | undefined | null) => {
    if (ms === undefined || ms === null) {
      return EmptyToken;
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
