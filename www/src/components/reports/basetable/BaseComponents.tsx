import { makeStyles } from "@mui/styles";
import { Tag, Tooltip } from "antd";
import { Render } from "components/table/TableRenderer";
import { ArrayHelper, getClassName } from "misc";
import React, { useMemo } from "react";
import { BaseCell, BaseData } from "./BaseCell";
import { BaseTable } from "./BaseTable";
import { CaretUpFilled, CaretDownFilled } from "@ant-design/icons";
import { blue } from "@ant-design/colors";

const useTableStyles = makeStyles({
  root: {
    textAlign: "center",
  },
  tableContainer: {
    maxWidth: "100%",
    display: "inline-block",
  },
  tableWrapper: {
    overflow: "auto hidden",
    maxWidth: "100%",
  },
  table: {
    marginLeft: "auto",
    marginRight: "auto",
    border: "1px solid #ddd",
    "& td,th": {
      border: "1px solid #ddd",
    },
    "& td": {
      textAlign: "left",
      position: "relative",
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

const useSorterStyles = makeStyles({
  sorter: {
    display: "flex",
    flex: "auto",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wrapper: {
    marginInlineStart: 4,
    color: "rgba(0, 0, 0, 0.29)",
    fontSize: 0,
    transition: "color 0.3s",
  },
  inner: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
  },
  sorterUp: {
    fontSize: 12,
    boxSizing: "border-box",
    cursor: "pointer",
    fontWeight: 600,
    overflowWrap: "break-word",
  },
  sorterDown: {
    fontSize: 12,
    boxSizing: "border-box",
    cursor: "pointer",
    fontWeight: 600,
    overflowWrap: "break-word",
    marginTop: "-0.4em",
  },
  active: {
    color: blue[5],
  },
});

/**
 * A base component to render a table-based report.
 */
export const BaseTableComponent = <
  C extends BaseCell<D>,
  T extends BaseTable<C, D>,
  D
>({
  title,
  footnote,
  table,
  renderCell,
  cellProps,
  rowProps,
}: {
  title?: string | React.ReactNode;
  footnote?: string | React.ReactNode;
  table: T;
  cellProps?: Omit<React.HTMLAttributes<HTMLTableCellElement>, "onClick"> & {
    onClick?: (cell: C, table: T) => void;
  };
  rowProps?: (
    table: T,
    row: number
  ) => React.HTMLAttributes<HTMLTableRowElement>;
  renderCell?: (
    cell: C,
    table: T,
    cellProps?: Omit<React.HTMLAttributes<HTMLTableCellElement>, "onClick"> & {
      onClick?: (cell: C, table: T) => void;
    }
  ) => React.ReactElement;
}) => {
  const classes = useTableStyles();
  const rowPropsFn = rowProps ?? ((table: T, row: number) => ({}));

  if (renderCell === undefined) {
    renderCell = (cell, table, cellProps) => (
      <BaseCellComponent
        key={`${cell.row}-${cell.col}`}
        cell={cell}
        table={table}
        {...cellProps}
      />
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.tableContainer}>
        {title !== undefined ? (
          <div className={classes.title}>{title}</div>
        ) : undefined}
        <div className={classes.tableWrapper}>
          <table className={getClassName(classes.table, classes.largeTable)}>
            <tbody>
              {table.data.map((row, ri) => {
                return (
                  <tr key={ri} {...rowPropsFn(table, ri)}>
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
    </div>
  );
};

export const BaseCellComponent = <
  T extends BaseTable<C, D>,
  C extends BaseCell<D>,
  D
>({
  cell,
  table,
  children,
  onClick,
  ...cellHTMLProps
}: {
  cell: C;
  table: T;
  children?: React.ReactNode;
  onClick?: (cell: C, table: T) => void;
} & Omit<React.HTMLAttributes<HTMLTableCellElement>, "onClick">) => {
  const label =
    typeof cell.label === "object" ? cell.label : Render.auto(cell.label);
  if (cell.th) {
    return (
      <th
        className={cell.className}
        style={cell.style}
        rowSpan={cell.rowSpan}
        colSpan={cell.colSpan}
        onClick={onClick !== undefined ? () => onClick(cell, table) : undefined}
        {...cellHTMLProps}
      >
        {label}
      </th>
    );
  }

  return (
    <td
      className={cell.className}
      style={cell.style}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      onClick={onClick !== undefined ? () => onClick(cell, table) : undefined}
      {...cellHTMLProps}
    >
      {label}
    </td>
  );
};

export const BaseCellLabelComponent = ({ data }: { data: BaseData }) => {
  const obj = data.computeData();
  if (obj.type === "number") {
    if (obj.size === 1 || obj.std <= 1e-9) {
      return (
        <Tooltip title={`Value: ${obj.mean}`}>{obj.mean.toFixed(3)}</Tooltip>
      );
    }

    return (
      <Tooltip
        title={
          <>
            <b>Mean:</b> {obj.mean}
            <br />
            <b>Std:</b> {obj.std}
            <br />
            <b>CI:</b> {obj.ci}
            <br />
            <b>Size:</b> {obj.size}
          </>
        }
      >
        {obj.mean.toFixed(3)} ± {obj.ci.toFixed(3)}
      </Tooltip>
    );
  }

  if (obj.type === "single") {
    return <span>{obj.value}</span>;
  }

  if (obj.type === "mixed") {
    return (
      <Tag color="error">
        can't render mixed-typed or multi non-numeric values
      </Tag>
    );
  }

  throw new Error("Unreachable");
};

export const BaseCellSortable = ({
  label,
  sortOrder,
}: {
  label: React.ReactNode;
  sortOrder: "asc" | "desc" | undefined;
}) => {
  const classes = useSorterStyles();

  return (
    <div className={classes.sorter}>
      {label}
      <span className={classes.wrapper}>
        <span
          className={classes.inner}
          title={`sorted order: ${sortOrder}ending`}
        >
          <CaretUpFilled
            className={getClassName(
              classes.sorterUp,
              sortOrder === "asc" ? classes.active : undefined
            )}
          />
          <CaretDownFilled
            className={getClassName(
              classes.sorterDown,
              sortOrder === "desc" ? classes.active : undefined
            )}
          />
        </span>
      </span>
    </div>
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
  const validActions = actions.filter((a) => a !== undefined);
  const newActions = [];
  for (let i = 0; i < validActions.length; i++) {
    newActions.push(<span key={i}>{validActions[i]}</span>);
    if (i < validActions.length - 1) {
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
