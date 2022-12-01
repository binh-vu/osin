import { makeStyles } from "@mui/styles";
import { Alert, Dropdown, Modal } from "antd";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { AttrGetter } from "models/reports";
import { useMemo, useState } from "react";
import { ReportData } from "../../ReportData";
import { Cell, Table, TableBuilder } from "../TableBuilder";
import { observer } from "mobx-react";
import {
  CellComponent,
  ExtraCell,
  extraCellFactory,
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

const useStyles = makeStyles({
  root: {},
  tableContainer: {
    width: "100%",
    overflow: "auto hidden",
  },
  table: {
    marginLeft: "auto",
    marginRight: "auto",
    border: "1px solid #ddd",
    "& td,th": {
      border: "1px solid #ddd",
      textAlign: "left",
    },
  },
  smallTable: {
    "& td,th": {
      padding: 8,
    },
  },
  middleTable: {
    "& td,th": {
      padding: "12px 8px",
    },
  },
  largeTable: {
    "& td,th": {
      padding: 16,
    },
  },
  title: {
    textAlign: "center",
    captionSide: "top",
    color: "rgba(0, 0, 0, 0.45)",
    paddingTop: "0.75em",
    paddingBottom: "0.3em",
  },
  footnote: {
    textAlign: "right",
    captionSide: "bottom",
    paddingTop: "0.3em",
    color: "rgba(0, 0, 0, 0.45)",
    paddingBottom: "0.3em",
  },
  actionSep: {
    fontWeight: 900,
    paddingLeft: 4,
    paddingRight: 4,
    color: "#1890ff",
  },
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
    recordKey,
    title,
    editURL,
    reportData,
    defaultZValueStyle = "column",
    defaultHighlightMode = "row-best",
    zvalues,
    onReload,
    renderRecordId,
  }: {
    recordKey: string;
    title: string | React.ReactElement;
    editURL: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    reportData: ReportData;
    defaultZValueStyle?: ZValueStyle;
    defaultHighlightMode?: HighlightMode;
    zvalues: [number | null, AttrGetter[]][];
    onReload?: () => void;
    renderRecordId?: (recordId: number) => React.ReactNode;
  }) => {
    const classes = useStyles();
    if (!reportTableRenderConfigStore.configs.has(recordKey)) {
      reportTableRenderConfigStore.configs.set(
        recordKey,
        new ReportTableRenderConfig(defaultZValueStyle, defaultHighlightMode)
      );
    }
    const reportTableRenderConfig =
      reportTableRenderConfigStore.configs.get(recordKey)!;

    const [showCell, setShowCell] = useState<undefined | ExtraCell>(undefined);

    const table1: Table<ExtraCell> | string = useMemo(() => {
      try {
        let nExtraRowHeaderCol = 0;
        let nExtraColHeaderRow = 0;
        let rowHeaderScale = 1;
        let colHeaderScale = 1;

        const nZValues = _.sum(zvalues.map(([_, a]) => a.length));
        if (nZValues > 1) {
          if (reportTableRenderConfig.zvalueStyle === "column") {
            nExtraColHeaderRow = 1;
            colHeaderScale = nZValues;
          } else if (reportTableRenderConfig.zvalueStyle === "row") {
            nExtraRowHeaderCol = 1;
            rowHeaderScale = nZValues;
          } else {
            const x = Math.ceil(Math.sqrt(nZValues));
            colHeaderScale = x;
            rowHeaderScale = x;
          }
        }

        const table = new TableBuilder(reportData, extraCellFactory).build(
          nExtraRowHeaderCol,
          nExtraColHeaderRow,
          rowHeaderScale,
          colHeaderScale
        );
        imputeCellData(table, zvalues, reportTableRenderConfig.zvalueStyle);
        return table;
      } catch (e: any) {
        console.error(e);
        return e.toString();
      }
    }, [reportData, reportTableRenderConfig.zvalueStyle]);

    const table: Table<ExtraCell> | string = useMemo(() => {
      if (typeof table1 === "string") {
        return table1;
      }

      try {
        return styleTable(
          highlightTable(table1.clone(), reportTableRenderConfig.highlight),
          classes
        ).fixSpanning();
      } catch (e: any) {
        console.error(e);
        return e.toString();
      }
    }, [table1, reportTableRenderConfig.highlight]);

    if (typeof table === "string" || typeof table1 === "string") {
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

    const onCellClick = (cell: ExtraCell) => {
      // do nothing if clicking on empty cells
      if (cell.row < table.rowstart && cell.col < table.colstart) return;
      // click on header to highlight by column/row
      // add col/row span to detect the leaf nodes so as we may have imbalance index tree
      if (
        cell.th &&
        (cell.row + cell.rowspan === table.rowstart ||
          cell.col + cell.colspan === table.colstart)
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

    return (
      <div className={classes.root}>
        <div className={classes.title}>{title}</div>
        <div className={classes.tableContainer}>
          <table className={getClassName(classes.table, classes.largeTable)}>
            <tbody>
              {table.data.map((row, ri) => {
                return (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      return (
                        <CellComponent
                          key={`${ri}-${ci}`}
                          cell={cell}
                          onClick={onCellClick}
                          highlight={reportTableRenderConfig.highlight}
                          table={table}
                        />
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={classes.footnote}>
          <Footnote
            editURL={editURL}
            classes={classes}
            highlight={reportTableRenderConfig.highlight}
            setHighlight={(highlight) => {
              reportTableRenderConfig.highlight = highlight;
            }}
            zvalues={zvalues}
            onReload={onReload}
            renderConfig={reportTableRenderConfig}
          />
        </div>
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
              table={table1}
              zvalues={zvalues}
              zstyle={reportTableRenderConfig.zvalueStyle}
              renderRecordId={renderRecordId}
            />
          ) : null}
        </Modal>
      </div>
    );
  }
);

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

export const Footnote = observer(
  <
    U extends Record<string, keyof ArgType>,
    Q extends Record<string, keyof ArgType>
  >({
    editURL,
    classes,
    highlight,
    setHighlight,
    zvalues,
    onReload,
    renderConfig,
  }: {
    editURL: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    classes: ReturnType<typeof useStyles>;
    highlight: HighlightMode;
    setHighlight: (highlight: HighlightMode) => void;
    zvalues: [number | null, AttrGetter[]][];
    onReload?: () => void;
    renderConfig: ReportTableRenderConfig;
  }) => {
    let desc = "";
    if (zvalues.length === 1 && zvalues[0][1].length === 1) {
      desc = `*each cell shows the average of ${zvalues[0][1][0].attr.getLabel()} - `;
    }

    return (
      <>
        {desc}
        <InternalLink
          path={editURL.path}
          urlArgs={editURL.urlArgs}
          queryArgs={editURL.queryArgs}
        >
          edit
        </InternalLink>
        <span className={classes.actionSep}>&#183;</span>
        <Dropdown
          menu={{
            items: (highlightModes as string[]).map((mode: string) => ({
              label: mode,
              key: mode,
            })),
            selectedKeys: typeof highlight === "string" ? [highlight] : [],
            onClick: ({ key }) => setHighlight(key as HighlightMode),
          }}
        >
          <a>highlight</a>
        </Dropdown>
        <span className={classes.actionSep}>&#183;</span>
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
            selectedKeys: [`zstyle.${renderConfig.zvalueStyle}`],
            onClick: ({ key, keyPath }) => {
              if (key.startsWith("zstyle.")) {
                renderConfig.zvalueStyle = key.slice(
                  "zstyle.".length
                ) as ZValueStyle;
              } else if (key === "reload" && onReload !== undefined) {
                onReload();
              }
            },
          }}
        >
          <a>more</a>
        </Dropdown>
      </>
    );
  }
);
