import { makeStyles } from "@mui/styles";
import { Alert, Dropdown, Modal } from "antd";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { AttrGetter } from "models/reports";
import { useMemo, useState } from "react";
import { ReportData, ReportDataPoint } from "../ReportData";
import { Table, TableBuilder } from "./TableBuilder";
import { observer } from "mobx-react";
import {
  CellComponent,
  Cell,
  cellFactory,
  imputeCellData,
  highlightTable,
  CellStatistics,
} from "./CellComponent";
import {
  HighlightMode,
  ReportTableRenderConfig,
  ReportTableRenderConfigStore,
  ZValueStyle,
} from "./ReportTableRenderConfig";
import { toJS } from "mobx";
import { BaseTableComponent, Footnote } from "../basetable/BaseComponents";

const useStyles = makeStyles({
  root: {},
  rowHeader: {
    borderLeft: "none !important",
  },
  metaRowHeader: {
    borderRight: "none !important",
    transform: "rotate(-180deg) !important",
    writingMode: "vertical-lr !important" as "vertical-lr",
    padding: "8px 0 !important",
    textAlign: "center !important" as "center",
    fontWeight: 400,
    fontStyle: "italic",
  },
  colHeader: {
    borderTop: "none !important",
    textAlign: "center !important" as "center",
  },
  metaColHeader: {
    borderBottom: "none !important",
    padding: "0 8px !important",
    textAlign: "center !important" as "center",
    fontWeight: 400,
    fontStyle: "italic",
  },
  lastColHeader: {
    borderTop: "none !important",
    textAlign: "left !important" as "left",
  },
  metaUselessHeader: {
    border: "none !important",
  },
  cellModal: {
    width: "80% !important",
    maxHeight: "calc(100% - 40px)",
    top: 20,
    "& .ant-modal-header": {
      display: "none",
    },
  },
  actionSep: {
    fontWeight: 900,
    paddingLeft: 4,
    paddingRight: 4,
    color: "#1890ff",
  },
});

export const reportTableRenderConfigStore = new ReportTableRenderConfigStore();
export const highlightModes: HighlightMode[] = [
  "none",
  "row",
  "col",
  "row-best",
  "col-best",
];

export const TableComponent = observer(
  <
    U extends Record<string, keyof ArgType>,
    Q extends Record<string, keyof ArgType>
  >({
    reportKey,
    title,
    editURL,
    reportData,
    defaultZValueStyle = "column",
    defaultHighlightMode = "row-best",
    onReload,
    renderRecordId,
    viewURL,
  }: {
    reportKey: string;
    title: string | React.ReactElement;
    viewURL?: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    editURL?: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    reportData: ReportData;
    defaultZValueStyle?: ZValueStyle;
    defaultHighlightMode?: HighlightMode;
    onReload?: () => void;
    renderRecordId?: (recordId: number) => React.ReactNode;
  }) => {
    const classes = useStyles();
    if (!reportTableRenderConfigStore.configs.has(reportKey)) {
      reportTableRenderConfigStore.configs.set(
        reportKey,
        new ReportTableRenderConfig(defaultZValueStyle, defaultHighlightMode)
      );
    }
    const reportTableRenderConfig =
      reportTableRenderConfigStore.configs.get(reportKey)!;

    const [showCell, setShowCell] = useState<undefined | Cell>(undefined);
    const table = useTable(reportData, reportTableRenderConfig);

    if (typeof table === "string") {
      // error while building table, put the or so that typescript knows table1 must also be a string
      return (
        <Alert
          message="Error"
          description={table}
          type="error"
          className="mb-8"
        />
      );
    }

    const onCellClick = (cell: Cell) => {
      // do nothing if clicking on empty cells
      if (cell.row < table.rowstart && cell.col < table.colstart) return;
      // click on header to highlight by column/row
      // add col/row span to detect the leaf nodes so as we may have imbalance index tree
      if (
        cell.th &&
        (cell.row + cell.rowSpan === table.rowstart ||
          cell.col + cell.colSpan === table.colstart)
      ) {
        // toggle highlight a column/row in a matrix
        if (cell.row < table.rowstart) {
          // clicking on a column header
          if (
            typeof reportTableRenderConfig.highlight !== "string" &&
            reportTableRenderConfig.highlight.type === "col" &&
            reportTableRenderConfig.highlight.value === cell.col
          ) {
            reportTableRenderConfig.highlight = defaultHighlightMode;
          } else {
            reportTableRenderConfig.highlight = {
              type: "col",
              value: cell.col,
            };
          }
        } else if (cell.col < table.colstart) {
          // clicking on a row header
          if (
            typeof reportTableRenderConfig.highlight !== "string" &&
            reportTableRenderConfig.highlight.type === "row" &&
            reportTableRenderConfig.highlight.value === cell.row
          ) {
            reportTableRenderConfig.highlight = defaultHighlightMode;
          } else {
            reportTableRenderConfig.highlight = {
              type: "row",
              value: cell.row,
            };
          }
        }
      }

      // click on a cell to display the cell's data
      if (!cell.th) {
        setShowCell(cell);
      }
    };

    let footnote = "";
    if (
      reportData.zvalues.length === 1 &&
      reportData.zvalues[0][1].length === 1
    ) {
      footnote = `*each cell shows the average of ${reportData.zvalues[0][1][0].getLabel()}`;
    }

    return (
      <div className={classes.root}>
        <BaseTableComponent<Cell, Table<Cell>, ReportDataPoint[]>
          table={table}
          title={title}
          renderCell={(cell, table, cellProps) => (
            <CellComponent
              key={`${cell.row}-${cell.col}`}
              cell={cell}
              onClick={onCellClick}
              highlight={reportTableRenderConfig.highlight}
              table={table}
            />
          )}
          footnote={
            <Footnote
              note={footnote}
              actions={[
                viewURL !== undefined ? (
                  <InternalLink
                    path={viewURL.path}
                    urlArgs={viewURL.urlArgs}
                    queryArgs={viewURL.queryArgs}
                  >
                    view
                  </InternalLink>
                ) : undefined,
                editURL !== undefined ? (
                  <InternalLink
                    path={editURL.path}
                    urlArgs={editURL.urlArgs}
                    queryArgs={editURL.queryArgs}
                  >
                    edit
                  </InternalLink>
                ) : undefined,
                <Dropdown
                  menu={{
                    items: (highlightModes as string[]).map((mode: string) => ({
                      label: mode,
                      key: mode,
                    })),
                    selectedKeys:
                      typeof reportTableRenderConfig.highlight === "string"
                        ? [reportTableRenderConfig.highlight]
                        : [],
                    onClick: ({ key }) => {
                      reportTableRenderConfig.highlight = key as HighlightMode;
                    },
                  }}
                >
                  <a>highlight</a>
                </Dropdown>,
                <Dropdown
                  menu={{
                    items: [
                      {
                        label: "reload",
                        key: "reload",
                        disabled: onReload === undefined,
                      },
                      {
                        label: "z-value displayed style",
                        key: "zstyle",
                        children: [
                          {
                            label: "show in columns",
                            key: "zstyle.column",
                          },
                          {
                            label: "show in rows",
                            key: "zstyle.row",
                          },
                        ],
                      },
                    ],
                    selectedKeys: [
                      `zstyle.${reportTableRenderConfig.zvalueStyle}`,
                    ],
                    onClick: ({ key, keyPath }) => {
                      if (key.startsWith("zstyle.")) {
                        reportTableRenderConfig.zvalueStyle = key.slice(
                          "zstyle.".length
                        ) as ZValueStyle;
                      } else if (key === "reload" && onReload !== undefined) {
                        onReload();
                      }
                    },
                  }}
                >
                  <a>more</a>
                </Dropdown>,
              ]}
            />
          }
        />
        <Modal
          open={showCell !== undefined}
          title="Cell Information"
          onCancel={() => setShowCell(undefined)}
          onOk={() => setShowCell(undefined)}
          footer={null}
          className={classes.cellModal}
        >
          {showCell !== undefined ? (
            <CellStatistics
              cell={showCell}
              table={table}
              zvalues={reportData.zvalues}
              zstyle={reportTableRenderConfig.zvalueStyle}
              renderRecordId={renderRecordId}
            />
          ) : null}
        </Modal>
      </div>
    );
  }
);

function useTable(
  reportData: ReportData,
  renderConfig: ReportTableRenderConfig
) {
  const classes = useStyles();

  const table1: Table<Cell> | string = useMemo(() => {
    try {
      let nExtraRowHeaderCol = 0;
      let nExtraColHeaderRow = 0;
      let rowHeaderScale = 1;
      let colHeaderScale = 1;

      const nZValues = _.sum(reportData.zvalues.map(([_, a]) => a.length));
      if (nZValues > 1) {
        if (renderConfig.zvalueStyle === "column") {
          nExtraColHeaderRow = 1;
          colHeaderScale = nZValues;
        } else if (renderConfig.zvalueStyle === "row") {
          nExtraRowHeaderCol = 1;
          rowHeaderScale = nZValues;
        } else {
          const x = Math.ceil(Math.sqrt(nZValues));
          colHeaderScale = x;
          rowHeaderScale = x;
        }
      }

      const table = new TableBuilder(reportData, cellFactory).build(
        nExtraRowHeaderCol,
        nExtraColHeaderRow,
        rowHeaderScale,
        colHeaderScale
      );
      imputeCellData(table, reportData.zvalues, renderConfig.zvalueStyle);
      return table;
    } catch (e: any) {
      console.error(e);
      return e.toString();
    }
  }, [reportData, renderConfig.zvalueStyle]);

  const table2: Table<Cell> | string = useMemo(() => {
    if (typeof table1 === "string") {
      return table1;
    }

    try {
      return styleTable(
        highlightTable(table1.clone(), renderConfig.highlight),
        classes
      ).fixSpanning();
    } catch (e: any) {
      console.error(e);
      return e.toString();
    }
  }, [table1, renderConfig.highlight]);

  return table2;
}

function styleTable<C extends Cell>(
  table: Table<C>,
  classes: ReturnType<typeof useStyles>
): Table<C> {
  for (let i = 0; i < table.nrows; i++) {
    for (let j = 0; j < table.ncols; j++) {
      const cell = table.data[i][j];

      if (i < table.rowstart && j >= table.colstart) {
        if (cell.metaTh) {
          cell.className = classes.metaColHeader;
        } else {
          cell.className =
            i === table.rowstart - 1
              ? classes.lastColHeader
              : classes.colHeader;
        }
      } else if (i >= table.rowstart && j < table.colstart) {
        if (cell.metaTh) {
          cell.className = classes.metaRowHeader;
        } else {
          cell.className = classes.rowHeader;
        }
      } else if (i < table.rowstart && j < table.colstart) {
        cell.className = classes.metaUselessHeader;
      }
    }
  }
  return table;
}
