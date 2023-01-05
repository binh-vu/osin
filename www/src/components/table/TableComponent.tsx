import { makeStyles } from "@mui/styles";
import { Skeleton, Table, Typography } from "antd";
import {
  ColumnsType,
  ColumnType,
  ExpandableConfig,
  FilterValue,
  SorterResult,
  TablePaginationConfig,
} from "antd/lib/table/interface";
import { QueryConditions } from "gena-app";
import { getClassName, IsMounted } from "misc";
import { observer } from "mobx-react";
import React, {
  ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { unstable_batchedUpdates } from "react-dom";
import { ColumnConfig, TableColumn, TableColumnIndex } from "./Columns";
import { TableToolbar } from "./TableToolBar";
import {
  // VirtualTableComponent1,
  VirtualTableComponent2,
} from "./VirtualTableComponent";

const useStyles = makeStyles({
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
  reload: () => Promise<void>;
  getRecordsByIds: (ids: (keyof R)[]) => R[];
  removeRecords?: (records: R[]) => Promise<void>;
  restoreRecords?: (records: R[]) => Promise<void>;
  isDeleted?: (rercord: R) => boolean;
  changeTableSize: (size: "small" | "middle" | "large") => void;
  currentTableSize: () => "small" | "middle" | "large";
  columns: () => ColumnsType<R>;
  internalColumns: () => TableColumnIndex<R>;
  setInternalColumns: (columns: TableColumnIndex<R>) => void;
  resetInternalColumns: (fromSaveState: boolean, isMounted?: IsMounted) => void;
  saveInternalColumns: () => void;
}

const DEFAULT_VIRTUAL_COLUMN_WIDTH = 128;

export interface TableComponentProps<R> {
  defaultPageSize?: number;
  rowKey: keyof R;
  defaultShowPageSizeChanger?: boolean;
  defaultTableSize?: "small" | "middle" | "large";
  store: {
    query: (
      limit: number,
      offset: number,
      conditions: QueryConditions<R>,
      sort: {
        field: keyof R;
        order: "desc" | "asc";
      }[]
    ) => Promise<{ records: R[]; total: number }>;
    remove?: (records: R[]) => Promise<void>;
    restore?: (records: R[]) => Promise<void>;
    isDeleted?: (record: R) => boolean;
  };
  toolbar?: React.ReactElement | object;
  showRowIndex?: boolean;
  columns: TableColumn<R>[];
  selectRows?: boolean;
  fullWidth?: boolean;
  scroll?: { x?: number | string | true; y?: number | string };
  expandable?: ExpandableConfig<any>;
  saveColumnState?: (cfgs: ColumnConfig[]) => void;
  restoreColumnState?: () => Promise<ColumnConfig[]>;
  virtualTable?: boolean;
}

export const TableComponent_ = <R extends object>(
  {
    defaultPageSize = 10,
    rowKey,
    defaultShowPageSizeChanger = true,
    defaultTableSize = "small",
    store,
    toolbar,
    showRowIndex = false,
    selectRows = false,
    columns,
    fullWidth = true,
    scroll,
    expandable,
    saveColumnState,
    restoreColumnState,
    virtualTable = false,
  }: TableComponentProps<R>,
  ref: ForwardedRef<TableComponentFunc<R>>
) => {
  const classes = useStyles();
  const [data, setData] = useState<{ data: R[]; offset: number }>({
    data: [],
    offset: 0,
  });
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
      return onRequestData(pagination, filters, sorter);
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
    restoreRecords: store.restore,
    removeRecords: store.remove,
    isDeleted: store.isDeleted,
    resetInternalColumns: (
      fromSaveState: boolean,
      isMounted: IsMounted = new IsMounted(true)
    ) => {
      let item = TableColumnIndex.fromNestedColumns(columns);
      if (fromSaveState && restoreColumnState !== undefined) {
        restoreColumnState().then((cfgs) => {
          if (cfgs.length > 0) {
            item = item.restoreChanges(cfgs);
          }
          if (isMounted.isMounted()) {
            setInternalColumns(item);
          }
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
    getRecordsByIds: (rids: (keyof R)[]) => {
      let id2records = Object.fromEntries(data.data.map((r) => [r[rowKey], r]));
      return rids.map((rid) => id2records[rid]);
    },
  };

  // handling the columns here
  useEffect(() => {
    let isMounted = new IsMounted(true);
    func.resetInternalColumns(true, isMounted);
    return isMounted.unmount;
  }, [columns]);

  const columns_ = useMemo(() => {
    return internalColumns === undefined
      ? undefined
      : internalColumns.getAntdColumns(virtualTable);
  }, [internalColumns]);

  // handling table data fetching
  const onRequestData = (
    paging: { limit: number; offset: number } | TablePaginationConfig,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<R>[],
    // extra: TableCurrentDataSource<R>
    isMounted: IsMounted = new IsMounted(true)
  ) => {
    // console.log("on request", { paging, filters, sorter });
    let limit: number, offset: number;
    if ("limit" in paging) {
      limit = paging.limit;
      offset = paging.offset;
    } else {
      limit = paging.pageSize!;
      offset = (paging.current! - 1) * limit;
    }

    let sortedBy = [];
    for (const item of sorter) {
      if (item.field !== undefined && item.order !== undefined) {
        const field = Array.isArray(item.field)
          ? item.field.join(".")
          : item.field.toString();
        sortedBy.push({
          field: field as keyof R,
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

    return store
      .query(limit, offset, conditions, sortedBy)
      .then(({ records, total }) => {
        // to prevent that data and pagination is out-of-sync.
        // react 18 will fix this issue
        unstable_batchedUpdates(() => {
          if (isMounted.isUnmounted()) {
            return;
          }
          if (!("limit" in paging)) {
            setData({ data: records, offset });
            setPagination({ ...paging, total });
          } else {
            // this is for virtual table, so instead of replace the data, we need to append it
            if (offset === data.data.length + data.offset) {
              // continue to append
              setData({ data: data.data.concat(records), offset: data.offset });
            } else if (offset === 0) {
              // they want to query a new batch of data (usually sort or filter change)
              setData({ data: records, offset });
            } else {
              console.error(
                "unreachable",
                offset,
                data.offset,
                data.data.length
              );
              throw new Error("Unreachable!");
            }
          }
        });
      });
  };
  useImperativeHandle(ref, () => func);

  // fetch the data for the first time
  useEffect(() => {
    let isMounted = new IsMounted(true);

    // get the default sortedBy
    let sorter = getDefaultSorter(columns);
    let filters = getDefaultFilters(columns);

    unstable_batchedUpdates(() => {
      if (isMounted.isUnmounted()) return;
      setSorter(sorter);
      setFilters(filters);
      onRequestData(pagination, filters, sorter, isMounted);
    });

    return isMounted.unmount;
  }, []);

  if (showRowIndex && columns_ !== undefined) {
    columns_.splice(0, 0, {
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
    toolbarel = (
      <TableToolbar
        {...toolbar}
        table={func}
        selectedRowKeys={selectedRowKeys}
        setSelectedRowKeys={setSelectedRowKeys}
      />
    );
  } else {
    toolbarel = toolbar;
  }

  if (columns_ === undefined) return <Skeleton loading={true} active={true} />;

  if (virtualTable && internalColumns !== undefined) {
    if (typeof (scroll || {}).y !== "number") {
      throw new Error("virtual table must have a fixed height");
    }

    return (
      <VirtualTableComponent2
        className={getClassName(classes.table, [
          fullWidth,
          classes.fullWidthTable,
        ])}
        rowKey={rowKey}
        bordered={true}
        size={tableSize}
        columns={columns_}
        expandable={expandable}
        scroll={{ y: scroll!.y as number, x: (scroll || {}).x }}
        data={data.data}
        internalColumns={internalColumns}
        pagination={{
          total: pagination.total || 0,
          offset: data.offset!,
        }}
        onChange={(
          antd_filters: Record<string, FilterValue | null>,
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

          unstable_batchedUpdates(() => {
            setSorter(antd_sorter as SorterResult<R>[]);
            setFilters(antd_filters);
            setData({ data: [], offset: 0 });
          });
          return onRequestData(
            { limit: defaultPageSize, offset: 0 },
            antd_filters,
            antd_sorter
          );
        }}
        fetchData={(start: number, end: number) => {
          // the formular to fetch is number of items displayed within the window + threshold (props of InfiniteLoader) * 2
          return onRequestData(
            { limit: end - start, offset: start },
            filters,
            sorter
          );
        }}
      />
    );
  }

  let table = (
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
      dataSource={data.data}
      pagination={pagination}
      rowKey={rowKey as string}
      columns={columns_}
      expandable={expandable}
      onChange={(
        antd_paging: TablePaginationConfig,
        antd_filters: Record<string, FilterValue | null>,
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
  );

  return (
    <>
      {toolbarel}
      {table}
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

const TableComponentFR_ = forwardRef(TableComponent_ as any);
export const TableComponent = observer(
  TableComponentFR_
) as typeof TableComponent_;
