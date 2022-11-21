import { makeStyles } from "@mui/styles";
import { Dropdown } from "antd";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import { getClassName } from "misc";
import { useMemo, useState } from "react";
import { ReportData } from "../../ReportData";
import { Cell, Table, TableBuilder } from "../TableBuilder";
import {
  CellComponent,
  ExtraCell,
  extraCellFactory,
  precomputeCellLabel,
  HighlightMode,
  highlightModes,
  highlightTable,
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
  },
  metaColHeader: {
    borderBottom: "none !important",
    padding: "0 8px !important",
    textAlign: "center !important" as "center",
    fontWeight: 400,
    fontStyle: "italic",
  },
  metaUselessHeader: {
    border: "none !important",
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
}: {
  title: string | React.ReactElement;
  editURL: {
    path: PathDef<U, Q>;
    urlArgs: ArgSchema<U>;
    queryArgs: ArgSchema<Q>;
  };
  reportData: ReportData;
  defaultHighlightMode?: HighlightMode;
}) => {
  const classes = useStyles();
  const [highlight, setHighlight] =
    useState<HighlightMode>(defaultHighlightMode);

  const table1 = useMemo(() => {
    const table = new TableBuilder(reportData, extraCellFactory).build();
    for (const row of table.data) {
      for (const cell of row) {
        cell.label = precomputeCellLabel(cell);
      }
    }
    return table;
  }, [reportData]);
  const table = useMemo(
    () =>
      styleTable(
        highlightTable(table1.clone(), highlight),
        classes
      ).fixSpanning(),
    [table1]
  );
  const onCellClick = (cell: ExtraCell) => {
    // do nothing if clicking on empty cells
    if (cell.row < table.rowstart && cell.col < table.colstart) return;

    // TODO: handle if click on z-value headers
    if (
      cell.th &&
      (cell.row === table.rowstart - 1 || cell.col === table.colstart)
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
          />
        </caption>
      </table>
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
          cell.className = classes.colHeader;
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
}: {
  editURL: {
    path: PathDef<U, Q>;
    urlArgs: ArgSchema<U>;
    queryArgs: ArgSchema<Q>;
  };
  classes: ReturnType<typeof useStyles>;
  highlight: HighlightMode;
  setHighlight: (highlight: HighlightMode) => void;
}) => {
  return (
    <>
      <InternalLink
        path={editURL.path}
        urlArgs={editURL.urlArgs}
        queryArgs={editURL.queryArgs}
      >
        edit the table
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
    </>
  );
};
