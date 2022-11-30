import { makeStyles } from "@mui/styles";
import { Dropdown, Modal } from "antd";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { AttrGetter } from "models/reports";
import { useMemo, useState } from "react";
import { ReportData } from "../../ReportData";
import { Cell, Table, TableBuilder } from "../TableBuilder";
import {
  CellComponent,
  ExtraCell,
  extraCellFactory,
  imputeCellData,
  HighlightMode,
  highlightModes,
  highlightTable,
  CellStatistics,
} from "./CellComponent";

const useStyles = makeStyles({
  root: {},
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
  caption: {
    textAlign: "center",
    captionSide: "top",
  },
  footnote: {
    textAlign: "right",
    captionSide: "bottom",
    paddingTop: "0.3em",
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

export const TableComponent = <
  U extends Record<string, keyof ArgType>,
  Q extends Record<string, keyof ArgType>
>({
  title,
  editURL,
  reportData,
  defaultHighlightMode = "row-best",
  zvalues,
  onReload,
  renderRecordId,
}: {
  title: string | React.ReactElement;
  editURL: {
    path: PathDef<U, Q>;
    urlArgs: ArgSchema<U>;
    queryArgs: ArgSchema<Q>;
  };
  reportData: ReportData;
  defaultHighlightMode?: HighlightMode;
  zvalues: [number | null, AttrGetter[]][];
  onReload?: () => void;
  renderRecordId?: (recordId: number) => React.ReactNode;
}) => {
  const classes = useStyles();
  const [highlight, setHighlight] =
    useState<HighlightMode>(defaultHighlightMode);
  const [zvalueStyle, setZValueStyle] = useState<"column" | "row" | "embedded">(
    "column"
  );
  const [showCell, setShowCell] = useState<undefined | ExtraCell>(undefined);

  const table1 = useMemo(() => {
    let nExtraRowHeaderCol = 0;
    let nExtraColHeaderRow = 0;
    let rowHeaderScale = 1;
    let colHeaderScale = 1;

    const nZValues = _.sum(zvalues.map(([_, a]) => a.length));
    if (nZValues > 1) {
      if (zvalueStyle === "column" && nZValues > 1) {
        nExtraColHeaderRow = 1;
        colHeaderScale = nZValues;
      } else if (zvalueStyle === "row") {
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
    imputeCellData(table, zvalues, zvalueStyle);
    return table;
  }, [reportData]);

  const table = useMemo(
    () =>
      styleTable(
        highlightTable(table1.clone(), highlight, zvalues, zvalueStyle),
        classes
      ).fixSpanning(),
    [table1, highlight]
  );

  const onCellClick = (cell: ExtraCell) => {
    // do nothing if clicking on empty cells
    if (cell.row < table.rowstart && cell.col < table.colstart) return;

    // click on header to highlight by column/row
    if (
      cell.th &&
      (cell.row === table.rowstart - 1 || cell.col === table.colstart - 1)
    ) {
      // toggle highlight a column/row in a matrix
      if (cell.row < table.rowstart) {
        // clicking on a column header
        if (
          typeof highlight !== "string" &&
          highlight.type === "col" &&
          highlight.value === cell.col
        ) {
          setHighlight(defaultHighlightMode);
        } else {
          setHighlight({ type: "col", value: cell.col });
        }
      } else if (cell.col < table.colstart) {
        // clicking on a row header
        if (
          typeof highlight !== "string" &&
          highlight.type === "row" &&
          highlight.value === cell.row
        ) {
          setHighlight(defaultHighlightMode);
        } else {
          setHighlight({ type: "row", value: cell.row });
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
      <table className={getClassName(classes.table, classes.largeTable)}>
        <caption className={classes.caption}>{title}</caption>
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
                      highlight={highlight}
                      table={table}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <caption className={classes.footnote}>
          <Footnote
            editURL={editURL}
            classes={classes}
            highlight={highlight}
            setHighlight={setHighlight}
            zvalues={zvalues}
            onReload={onReload}
          />
        </caption>
      </table>
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
            zstyle={zvalueStyle}
            renderRecordId={renderRecordId}
          />
        ) : null}
      </Modal>
    </div>
  );
};

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

export const Footnote = <
  U extends Record<string, keyof ArgType>,
  Q extends Record<string, keyof ArgType>
>({
  editURL,
  classes,
  highlight,
  setHighlight,
  zvalues,
  onReload,
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
      {onReload !== undefined ? (
        <>
          <span className={classes.actionSep}>&#183;</span>
          <a onClick={onReload}>reload</a>
        </>
      ) : undefined}
    </>
  );
};
