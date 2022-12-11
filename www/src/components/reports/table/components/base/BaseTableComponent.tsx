import { ClassNameMap, makeStyles } from "@mui/styles";
import { Dropdown } from "antd";
import { Render } from "components/table/TableRenderer";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import { getClassName } from "misc";

const useTableStyles = makeStyles({
  tableContainer: {
    maxWidth: "100%",
    overflow: "auto hidden",
    display: "inline-block",
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
    position: "relative",
    right: 0,
  },
});

const useFooterStyles = makeStyles({
  actionSep: {
    fontWeight: 900,
    paddingLeft: 4,
    paddingRight: 4,
    color: "#1890ff",
  },
});

export interface BaseCell {
  // the cell value.
  label: string | number | boolean;
  // the row and column index of this cell.
  row: number;
  col: number;
  // whether this cell is a header cell.
  th: boolean;
  // whether this cell is a meta header cell.
  metaTh: boolean;
  // row/column span of this cell.
  rowSpan: number;
  colSpan: number;
  // the style and class attributes of this cell.
  style?: React.CSSProperties;
  className?: string;
}

export class BaseTable<C extends BaseCell> {
  data: C[][];
  nrows: number;
  ncols: number;

  constructor(data: C[][], nrows: number, ncols: number) {
    this.data = data;
    this.nrows = nrows;
    this.ncols = ncols;
  }

  clone() {
    return new BaseTable(
      this.data.map((row) => row.map((cell) => ({ ...cell }))),
      this.nrows,
      this.ncols
    );
  }

  /**
   * For html table spanning to work correctly, if the cell is column spanned, then the cell on the right
   * must be removed. If the cell is row spanned, then the cell below must be removed.
   *
   * This simple algorithm works by first creating a flag table, in which each cell is marked as false
   * if it is supposted to be removed. Then the table is traversed from top to bottom, left to right, and
   * remove the cell if it is marked as true.
   *
   * Note that this function implies when the cell is spanned, the cell on the right/below must be removed regardless
   * of its span.
   */
  fixSpanning(): BaseTable<C> {
    if (this.data.length === 0) {
      return this;
    }
    const flags: boolean[][] = [];

    for (let i = 0; i < this.nrows; i++) {
      flags.push([]);
      for (let j = 0; j < this.ncols; j++) {
        flags[i].push(true);
      }
    }

    for (let i = this.nrows - 1; i >= 0; i--) {
      for (let j = this.ncols - 1; j >= 0; j--) {
        const cell = this.data[i][j];
        if (cell.rowSpan === 1 && cell.colSpan === 1) {
          continue;
        }
        for (let u = 0; u < cell.rowSpan; u++) {
          for (let v = 0; v < cell.colSpan; v++) {
            flags[i + u][j + v] = false;
          }
        }
        flags[i][j] = true;
      }
    }

    for (let i = 0; i < this.nrows; i++) {
      this.data[i] = this.data[i].filter((_, j: number) => flags[i][j]);
    }

    return this;
  }
}

/**
 * A base component to render a table-based report.
 */
export const BaseTableComponent = <C extends BaseCell, T extends BaseTable<C>>({
  title,
  footnote,
  table,
  renderCell,
  cellProps,
}: {
  title?: string | React.ReactNode;
  footnote?: string | React.ReactNode;
  table: T;
  cellProps?: React.HTMLAttributes<HTMLTableCellElement>;
  renderCell?: (
    cell: C,
    table: T,
    cellProps?: React.HTMLAttributes<HTMLTableCellElement>
  ) => React.ReactElement;
}) => {
  const classes = useTableStyles();
  if (renderCell === undefined) {
    renderCell = (cell, table, cellProps) => (
      <BaseCellComponent
        key={`${cell.row}-${cell.col}`}
        cell={cell}
        {...cellProps}
      />
    );
  }
  return (
    <div className={classes.tableContainer}>
      {title !== undefined ? (
        <div className={classes.title}>{title}</div>
      ) : undefined}
      <div>
        <table className={getClassName(classes.table, classes.largeTable)}>
          <tbody>
            {table.data.map((row, ri) => {
              return (
                <tr key={ri}>
                  {row.map((cell) => renderCell!(cell, table, cellProps))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footnote !== undefined ? (
        <div className={classes.footnote}>{footnote}</div>
      ) : undefined}
    </div>
  );
};

export const BaseCellComponent = <C extends BaseCell, T extends BaseTable<C>>({
  cell,
  children,
  ...cellHTMLProps
}: {
  cell: C;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLTableCellElement>) => {
  const label = Render.auto(cell.label);
  if (cell.th) {
    return (
      <th
        className={cell.className}
        style={cell.style}
        rowSpan={cell.rowSpan}
        colSpan={cell.colSpan}
        {...cellHTMLProps}
      >
        {label}
        {children}
      </th>
    );
  }

  return (
    <td
      className={cell.className}
      style={cell.style}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      {...cellHTMLProps}
    >
      {label}
      {children}
    </td>
  );
};

/** Footnote of a table */
export const Footnote = ({
  note,
  actions,
}: {
  note?: string | React.ReactNode;
  actions: React.ReactNode[];
}) => {
  const classes = useFooterStyles();
  const newActions = [];
  for (let i = 0; i < actions.length; i++) {
    newActions.push(<span key={i}>{actions[i]}</span>);
    if (i < actions.length - 1) {
      newActions.push(
        <span key={`${i}-sep`} className={classes.actionSep}>
          &#183;
        </span>
      );
    }
  }

  const noteEl = note !== undefined ? <span>{note}&nbsp;</span> : undefined;

  return (
    <>
      {noteEl}
      {newActions}
    </>
  );
};
