import { makeStyles } from "@mui/styles";
import { Spin, Table, theme } from "antd";
import {
  ExpandableConfig,
  FilterValue,
  SorterResult,
} from "antd/lib/table/interface";
import { ArrayHelper, getClassName, MapHelper, SetHelper } from "misc";
import ResizeObserver from "rc-resize-observer";
import React, { useEffect, useRef, useState } from "react";
import { VariableSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { useDeepCompareMemo } from "use-deep-compare";
import {
  FlattenTableColumn,
  getRecordValue,
  TableColumn,
  TableColumnIndex,
  TableColumnMeasurement,
} from "./Columns";
import { TableComponentProps } from "./TableComponent";
import { PlusSquareOutlined, PlusOutlined } from "@ant-design/icons";
import { LoadingComponent } from "gena-app";

const CSS_VIRTUAL_TABLE = "virtual-table";
const CSS_VIRTUAL_TABLE_SMALL = "virtual-table-small";
const CSS_VIRTUAL_TABLE_MEDIUM = "virtual-table-medium";
const CSS_VIRTUAL_TABLE_LARGE = "virtual-table-large";
const CSS_VIRTUAL_TABLE_BORDERED = "virtual-table-bordered";
const CSS_VIRTUAL_TABLE_CELL = "virtual-table-cell";
const CSS_VIRTUAL_TABLE_EXPANDABLE = "virtual-table-expandable";
const CSS_VIRTUAL_TABLE_EXPANDED_ROW = "virtual-table-expanded-row";

const VTSIZE = {
  small: CSS_VIRTUAL_TABLE_SMALL,
  middle: CSS_VIRTUAL_TABLE_MEDIUM,
  large: CSS_VIRTUAL_TABLE_LARGE,
};
const VT_EXPANDABLE_BUTTON_WIDTH = 23; // the button size is 15px + (2px border), 23 so it can be manually centered
const LINE_HEIGHT = 22 / 14; // 1.5714285714285714
const FONT_SIZE = 14;
const SPACE = {
  sortIconSpace: 8,
  paddingWidth: {
    small: 8,
    middle: 8,
    large: 16,
  },
  paddingHeight: {
    small: 8,
    middle: 12,
    large: 16,
  },
};

const useStyles = makeStyles({
  root: {
    "& div:not(.virtual-table-expanded-row) .virtual-table-small .virtual-table-cell":
      {
        padding: 8,
      },
    "& .virtual-table-medium .virtual-table-cell": {
      padding: "12px 8px",
    },
    "& .virtual-table-large .virtual-table-cell": {
      padding: 16,
    },
    "& .virtual-table .virtual-table-cell": {
      display: "inline-block",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      lineHeight: LINE_HEIGHT,
      fontSize: FONT_SIZE,
    },
    "& .virtual-table-bordered .virtual-table-cell": {
      borderBottom: "1px solid rgba(5, 5, 5, 0.06)",
      borderRight: "1px solid rgba(5, 5, 5, 0.06)",
    },
    "& .virtual-table-bordered .virtual-table-cell:first-child": {
      borderLeft: "1px solid rgba(5, 5, 5, 0.06)",
    },
    "& .virtual-table-expandable .virtual-table-cell:first-child": {
      borderRight: "none !important",
      textAlign: "center",
    },
    "& .virtual-table-expandable > div > div > div > div > div > table > thead > tr:first-child > th:first-child":
      {
        borderRight: "none !important",
      },
    "& .virtual-table-bordered .virtual-table-expanded-row": {
      borderBottom: "1px solid rgba(5, 5, 5, 0.06)",
      position: "relative",
      overflow: "auto",
    },
  },
});

export interface VirtualTablePaginationConfig {
  total: number;
  offset: number;
}

let tableMeasurement: TableColumnMeasurement | undefined = undefined;

export const VirtualTableComponent = <R extends object>({
  scroll,
  columns,
  size = "small",
  rowKey,
  className,
  data,
  bordered,
  pagination,
  fetchData,
  internalColumns,
  onChange,
  expandable,
}: Pick<TableComponentProps<R>, "scroll" | "columns"> & {
  rowKey: keyof R;
  className?: string;
  size?: "small" | "middle" | "large";
  data: R[];
  bordered?: boolean;
  pagination: VirtualTablePaginationConfig;
  fetchData: (start: number, end: number) => Promise<void>;
  internalColumns: TableColumnIndex<R>;
  onChange: (
    antd_filters: Record<string, FilterValue | null>,
    antd_sorter: SorterResult<R> | SorterResult<R>[]
  ) => Promise<void>;
  expandable?: ExpandableConfig<R>;
}) => {
  const classes = useStyles();
  const { token } = theme.useToken();
  // we have two numbers, the one is the width of the table container, and the other one is the total width of table columns
  const [containerWidth, setContainerWidth] = useState(1024);
  const prevCloseExpandedIndex = useRef<number>(Number.MAX_SAFE_INTEGER);
  const [expandedRows, setExpandedRows] = useState<Map<number, number>>(
    new Map()
  );

  const [newColumns, leafColumns, totalColumnWidth] = useAutoTableWidth({
    internalColumns,
    data,
    containerWidth,
    headerExtraWidth: SPACE.sortIconSpace + SPACE.paddingWidth[size] * 2,
    cellExtraWidth: SPACE.paddingWidth[size] * 2,
    expandable: expandable
      ? {
          isExpandable: expandable.rowExpandable!,
          hasExpanded: (record: R, rowIndex: number) => {
            return expandedRows.has(rowIndex);
          },
          onExpand: (record: R, rowIndex: number) => {
            let newExpandedRows;
            if (expandedRows.has(rowIndex)) {
              // delete, and we need to mark this
              if (rowIndex < prevCloseExpandedIndex.current) {
                prevCloseExpandedIndex.current = rowIndex;
              }
              newExpandedRows = MapHelper.delete(expandedRows, rowIndex);
              // console.log(
              //   "remove expanded row: ",
              //   rowIndex,
              //   expandedRows,
              //   newExpandedRows
              // );
            } else {
              newExpandedRows = MapHelper.set(expandedRows, rowIndex, -1);
              // console.log(
              //   "add expanded row: ",
              //   rowIndex,
              //   expandedRows,
              //   newExpandedRows
              // );
            }
            setExpandedRows(newExpandedRows);
          },
        }
      : undefined,
  });
  // 1 is the border bottom width; this is not perflect as in table the border is placed in the middle -> 0.5, but
  // we can't do better than this with inf loader
  const rowHeight = LINE_HEIGHT * FONT_SIZE + SPACE.paddingHeight[size] * 2 + 1;
  const height =
    (scroll!.y as number) - (internalColumns.getTreeHeight() * rowHeight + 1); // -1 for the border top

  const maxExpandableHeight = Math.floor(height * 0.7);
  const varsizeListRef = useRef<any>();

  useEffect(() => {
    if (varsizeListRef.current) {
      // we need to detect if previous action is delete or set
      const minIndex = Math.min(...expandedRows.keys());
      // console.log(">>>", minIndex, prevCloseExpandedIndex.current);
      if (minIndex < prevCloseExpandedIndex.current) {
        if (Array.from(expandedRows.values()).every((v) => v >= 0)) {
          varsizeListRef.current.resetAfterIndex(minIndex);
        }
      } else {
        // console.log(
        //   "reset after index",
        //   minIndex,
        //   prevCloseExpandedIndex.current,
        //   expandedRows
        // );
        varsizeListRef.current.resetAfterIndex(
          prevCloseExpandedIndex.current,
          true
        );
        prevCloseExpandedIndex.current = Number.MAX_SAFE_INTEGER;
      }
    }
  }, [expandedRows, varsizeListRef.current]);

  // use to sync the scroll position between the header and body
  const virtualListRef = useRef<HTMLDivElement>(null);
  const infLoaderRef = useRef<InfiniteLoader>(null);
  const [connectObject] = useState<any>(() => {
    const obj = {};
    Object.defineProperty(obj, "scrollLeft", {
      get: () => {
        if (virtualListRef.current) {
          return virtualListRef.current.scrollLeft;
        }
        return null;
      },
      set: (scrollLeft: number) => {
        if (virtualListRef.current) {
          virtualListRef.current.scrollTo({ left: scrollLeft });
        }
      },
    });

    return obj;
  });

  const onTableChange = (
    paging: any,
    filter: Record<string, FilterValue | null>,
    sorter: SorterResult<R> | SorterResult<R>[]
  ) => {
    return onChange(filter, sorter).then(() => {
      if (infLoaderRef.current) {
        infLoaderRef.current.resetloadMoreItemsCache(true);
      }
    });
  };

  const getItem = (index: number) => data[index - pagination.offset];
  const isItemLoaded = (index: number) =>
    index - pagination.offset < data.length;

  const renderBody = (
    rawData: readonly R[],
    { scrollbarSize, ref, onScroll }: any
  ) => {
    ref.current = connectObject;
    return (
      <div
        ref={virtualListRef}
        style={{ width: "100%", overflow: "auto" }}
        onScroll={() => {
          if (virtualListRef.current) {
            onScroll({ scrollLeft: virtualListRef.current.scrollLeft });
          }
        }}
      >
        <InfiniteLoader
          ref={infLoaderRef}
          isItemLoaded={isItemLoaded}
          itemCount={pagination.total}
          loadMoreItems={(start: number, end: number) =>
            fetchData(start, end + 1)
          }
        >
          {({ onItemsRendered, ref }: any) => {
            return (
              <List
                ref={(el) => {
                  ref(el);
                  varsizeListRef.current = el;
                }}
                onItemsRendered={onItemsRendered}
                height={height}
                width={totalColumnWidth}
                itemSize={(index) => {
                  let expandedLength = Math.max(
                    expandedRows.get(index) || 0,
                    0
                  );
                  return rowHeight + expandedLength;
                }}
                itemCount={pagination.total}
                innerRef={(el) => {
                  if (el !== null) {
                    // hack to set the background color of the list so that it hides the expandable button
                    el.style.backgroundColor = token.colorBgContainer;
                  }
                }}
              >
                {({ index, style }) => {
                  if (!isItemLoaded(index)) {
                    return (
                      <div
                        key={index}
                        style={{
                          ...style,
                          textAlign: "center",
                          padding: SPACE.paddingHeight[size],
                        }}
                      >
                        <Spin size={"small"} />
                        <a style={{ paddingLeft: 8 }}>Loading {index}...</a>
                      </div>
                    );
                  }
                  const record = getItem(index);
                  // if (index === 2) {
                  //   console.log("render vt outside", index, expandedRows);
                  // }
                  return (
                    <VirtualRow
                      columns={leafColumns}
                      rowKey={rowKey}
                      rowIndex={index}
                      rowHeight={rowHeight}
                      record={record}
                      style={style}
                      expanded={
                        expandedRows.has(index)
                          ? {
                              render: (record: R) =>
                                expandable!.expandedRowRender!(
                                  record,
                                  index,
                                  (leafColumns[0].width as number) +
                                    ((leafColumns[1].moreWidth.user ||
                                      leafColumns[1].moreWidth.auto) as number),
                                  true
                                ),
                              paddingHeight: SPACE.paddingHeight[size],
                              prevHeight: expandedRows.get(index)!,
                              setHeight: (height: number) => {
                                if (expandedRows.get(index)! !== height) {
                                  setExpandedRows(
                                    MapHelper.set(expandedRows, index, height)
                                  );
                                }
                              },
                              backgroundColor: token.colorBgLayout,
                              maxHeight: maxExpandableHeight,
                            }
                          : undefined
                      }
                    />
                  );
                }}
              </List>
            );
          }}
        </InfiniteLoader>
      </div>
    );
  };

  return (
    <div className={classes.root}>
      <div>
        <ResizeObserver
          onResize={({ width }) => {
            setContainerWidth(width);
          }}
        >
          <Table
            className={getClassName(
              className,
              CSS_VIRTUAL_TABLE,
              VTSIZE[size],
              [expandable !== undefined, CSS_VIRTUAL_TABLE_EXPANDABLE],
              [bordered === true, CSS_VIRTUAL_TABLE_BORDERED]
            )}
            size={size}
            bordered={true}
            scroll={scroll}
            columns={newColumns}
            components={{
              body: renderBody,
            }}
            pagination={false}
            onChange={onTableChange}
          />
        </ResizeObserver>
      </div>
    </div>
  );
};

const VirtualRow = <R extends object>({
  rowKey,
  rowIndex,
  rowHeight,
  columns,
  record,
  className,
  style,
  expanded,
}: {
  rowKey: keyof R;
  rowIndex: number;
  rowHeight: number;
  record: R;
  columns: FlattenTableColumn<R>[];
  className?: string;
  style?: React.CSSProperties;
  expanded?: {
    render: (record: R) => React.ReactNode;
    prevHeight: number;
    setHeight: (height: number) => void;
    maxHeight: number;
    paddingHeight: number;
    backgroundColor: string;
  };
}) => {
  const cells = [];
  const ref = useRef<any>();

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    let cell = getRecordValue(record, col);
    if (col.render !== undefined) {
      cell = col.render(cell, record, rowIndex);
    }
    cells.push(
      <div
        key={col.key}
        className={CSS_VIRTUAL_TABLE_CELL}
        style={{ width: col.moreWidth.user || col.moreWidth.auto }}
      >
        {cell}
      </div>
    );
  }
  const key = record[rowKey] as React.Key;

  // if (rowIndex === 2) {
  //   console.log("render vt", rowIndex, expanded);
  // }

  if (expanded !== undefined) {
    return (
      <div key={key} className={className} style={style}>
        <div style={{ height: rowHeight }}>{cells}</div>
        <ResizeObserver
          onResize={({ height }) => {
            // plus 1 for the border
            height = height + 1;
            if (height !== expanded.prevHeight) {
              expanded.setHeight(height);
            }
          }}
        >
          <div
            key={"expanded"}
            className={CSS_VIRTUAL_TABLE_EXPANDED_ROW}
            ref={ref}
            style={{
              zIndex: expanded.prevHeight >= 0 ? 100 : -1,
              backgroundColor: expanded.backgroundColor,
              maxHeight: expanded.maxHeight,
            }}
          >
            <div
              style={{
                maxHeight: expanded.maxHeight - expanded.paddingHeight * 2,
                marginTop: expanded.paddingHeight,
                marginBottom: expanded.paddingHeight,
              }}
            >
              {expanded.render(record)}
            </div>
          </div>
        </ResizeObserver>
      </div>
    );
  } else {
    return (
      <div key={key} className={className} style={style}>
        {cells}
      </div>
    );
  }
};

const ExpandableIcon = <R extends object>({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className={getClassName(
        "ant-table-row-expand-icon",
        expanded
          ? "ant-table-row-expand-icon-expanded"
          : "ant-table-row-expand-icon-collapsed"
      )}
      aria-label="Expand row"
      aria-expanded={expanded ? "true" : "false"}
      // because the button float left - text align doesn't work, calculated based on the expandableWidth = (22 - 17)/2
      style={{
        marginLeft: (VT_EXPANDABLE_BUTTON_WIDTH - 17) / 2,
        marginBottom: (LINE_HEIGHT * FONT_SIZE - 17) / 2,
      }}
    ></button>
  );
};

/**
 * Re-calculate the table width when:
 *
 * (1) the columns change
 * (2) the container width changes
 * (3) the data changes (but only for the first time!)
 */
function useAutoTableWidth<R extends object>({
  containerWidth,
  data,
  internalColumns,
  headerExtraWidth = 16,
  cellExtraWidth = 16,
  expandable,
}: {
  containerWidth: number;
  data: R[];
  internalColumns: TableColumnIndex<R>;
  headerExtraWidth?: number;
  cellExtraWidth?: number;
  expandable?: {
    isExpandable: (record: R) => boolean;
    hasExpanded: (record: R, rowIndex: number) => boolean;
    onExpand: (record: R, rowIndex: number) => void;
  };
}): [TableColumn<R>[], FlattenTableColumn<R>[], number] {
  const previousDataRef = useRef<R[]>();
  const expandableWidth = VT_EXPANDABLE_BUTTON_WIDTH + cellExtraWidth + 1; // 1 for the border left
  let leafColumns = internalColumns.getLeafColumns();
  const matterColumns = leafColumns.map((col) => ({
    key: col.key,
    title: col.title,
    width: col.width,
    moreWidth: col.moreWidth,
  }));

  let [columns, leafColumns2, totalWidth] = useDeepCompareMemo(() => {
    // const vvv = (previousDataRef.current || []).length > 0;
    // set the data if it's the first time or we haven't received any meaningful data yet
    if ((previousDataRef.current || []).length === 0) {
      previousDataRef.current = data;
    }
    // compute the width of leaf columns
    const c2w = computeColumnWidths(internalColumns, previousDataRef.current!, {
      tableWidth: expandable
        ? containerWidth - expandableWidth
        : containerWidth,
      headerExtraWidth,
      cellExtraWidth,
    });
    const totalWidth = ArrayHelper.sum(Array.from(c2w.values()));
    const newInternalColumns = internalColumns.setColumnAutoWidth(
      (col) => c2w.get(col.key)!
    );
    return [
      newInternalColumns.getAntdColumns(true),
      newInternalColumns.getLeafColumns(),
      totalWidth,
    ];
  }, [
    containerWidth,
    (previousDataRef.current || []).length > 0,
    matterColumns,
  ]);

  if (expandable !== undefined) {
    const expandColumn = {
      key: "vt-internal-expandable",
      title: "",
      width: expandableWidth,
      moreWidth: {
        user: expandableWidth,
      },
      render: (value: any, record: R, rowIndex: number) => {
        if (!expandable.isExpandable(record)) return undefined;
        return (
          <ExpandableIcon
            expanded={expandable.hasExpanded(record, rowIndex)}
            onClick={() => {
              expandable.onExpand(record, rowIndex);
            }}
          />
        );
      },
    };
    leafColumns2 = [expandColumn as FlattenTableColumn<R>].concat(leafColumns2);
    columns = [expandColumn as TableColumn<R>].concat(columns);
    totalWidth += expandableWidth;
  }

  return [columns, leafColumns2, totalWidth];
}

/**
 * This function calculates width of each column such that:
 *
 * (1) the total column width is greater than or equal to the table width
 * (2) the amount of column width is allocated based on its relative length with other columns
 * (3) the minimum width of each column is determined based on its header text. We don't want
 *     the header text to be truncated.
 *
 * First, we remove the columns that already had a width specified by the user, and update the table width.
 * Then, if the total minimum width is greater than the table width, we use the minimum width. Otherwise,
 * each column will get an extra width from the remaining space based on its ratio (with some special handling for extra spaces).
 */
function computeColumnWidths<R extends object>(
  internalColumns: TableColumnIndex<R>,
  data: R[],
  options: {
    tableWidth: number;
    headerExtraWidth: number;
    cellExtraWidth: number;
    knownColumnWidths?: Map<React.Key, number>;
  }
): Map<React.Key, number> {
  if (tableMeasurement === undefined) {
    // default font in antd table
    const fontFamily =
      '-apple-system, "system-ui", "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
    tableMeasurement = new TableColumnMeasurement(
      `normal normal 600 14px ${fontFamily}`,
      `normal normal 400 14px ${fontFamily}`
    );
  }

  // calculate column widths of unfixed columns
  let tableWidth = options.tableWidth;
  const leafColumns = internalColumns.getLeafColumns();
  const columns: FlattenTableColumn<R>[] = [];
  const unfixedIndices: Map<number, number> = new Map();
  const headers = [];
  const cells = [];
  for (let i = 0; i < leafColumns.length; i++) {
    const col = leafColumns[i];
    if (col.moreWidth.user === undefined) {
      unfixedIndices.set(i, columns.length);
      columns.push(col);
      // use default header Name in case title is a ReactNode, if users don't like it, they 'may' adjust the width manually themselves
      // headers.push(typeof col.title === "string" ? col.title : "Name");
      headers.push(getReactNodeText(col.title));
      cells.push(
        data.map((r, ri) => {
          const c = getRecordValue(r, col);
          if (col.render !== undefined) {
            return getReactNodeText(col.render(c, r, ri));
          }
          return c;
        })
      );
    } else {
      tableWidth -= col.moreWidth.user;
    }
  }
  const minimumWidths = headers.map(tableMeasurement!.measureHeaderTextWidth);
  const totalMinimumWidth =
    ArrayHelper.sum(minimumWidths) + options.headerExtraWidth * headers.length;

  let columnWidths = tableMeasurement.measureColumnWidths(headers, cells);
  let extraWidths = columnWidths.map((w, i) =>
    w === minimumWidths[i] ? options.headerExtraWidth : options.cellExtraWidth
  );

  if (totalMinimumWidth <= tableWidth) {
    // we can fit all columns within the table width if we use the minimum width
    const totalExtraWidth = ArrayHelper.sum(extraWidths);
    const totalColumnWidth = ArrayHelper.sum(columnWidths);
    const columnRatio = columnWidths.map((w) => w / totalColumnWidth);

    if (totalExtraWidth + totalColumnWidth < tableWidth) {
      // it's even better, we have plenty of space
      let remainSpace = tableWidth - totalExtraWidth - totalColumnWidth;
      columnWidths = columnWidths.map((w, i) => {
        return columnWidths[i] + columnRatio[i] * remainSpace + extraWidths[i];
      });
    } else {
      let remainSpace = tableWidth - totalMinimumWidth;
      columnWidths = columnWidths.map((w, i) => {
        return minimumWidths[i] + columnRatio[i] * remainSpace;
      });
    }
  } else {
    // else, cannot fit all columns, so we just use the column widths + extraWidth as users have to scroll anyway
    columnWidths = columnWidths.map((w, i) => w + extraWidths[i]);
  }

  // adjust the column widths to integer so that its total is equal to the table width
  // even after adjusting, the width of the last element is not integer, I don't know why
  // so I minus 1 so that the total width is always 1 less than the table width, it seems that
  // with the border, it is not distinguishable.
  columnWidths = columnWidths.map((w) => Math.floor(w));
  const diff = tableWidth - ArrayHelper.sum(columnWidths);
  columnWidths[ArrayHelper.maxIndex(columnWidths)] += diff - 1;

  return new Map(
    leafColumns.map((c, i) => {
      if (unfixedIndices.has(i)) {
        const j = unfixedIndices.get(i)!;
        return [c.key, columnWidths[j]];
      }
      return [c.key, c.moreWidth.user!];
    })
  );
}

function getReactNodeText(node: any): string {
  if (["string", "number"].includes(typeof node)) return node.toString();
  if (node instanceof Array) return node.map(getReactNodeText).join("");
  if (typeof node === "object" && node)
    return getReactNodeText(node.props.children);

  console.error("Unreachable! Unknown React node type:", node);
  throw new Error("Unknown react node type");
}
