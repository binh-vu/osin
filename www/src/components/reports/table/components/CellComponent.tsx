import { gold } from "@ant-design/colors";
import { faHighlighter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";
import { Cell, cellFactory, Table } from "../TableBuilder";

export type HighlightMode =
  | "none"
  | "row"
  | "col"
  | "a-col"
  | "a-row"
  | "row-best"
  | "col-best"
  | { type: "row"; value: number }
  | { type: "col"; value: number };
export const highlightModes: HighlightMode[] = [
  "none",
  "row",
  "col",
  "row-best",
  "col-best",
];
export interface ExtraCell extends Cell {
  // for highlighting cell, not put in style because
  // we want to be flexible in terms of how to highlight
  highlight: {
    mode?: "dot" | "text";
    color?: string;
    bold?: boolean;
  };
}

export const extraCellFactory: () => ExtraCell = () => {
  const cell = cellFactory() as ExtraCell;
  cell.highlight = {};
  return cell;
};

export const CellComponent = ({
  table,
  cell,
  onClick,
  highlight,
}: {
  table: Table<ExtraCell>;
  cell: ExtraCell;
  onClick: (cell: ExtraCell) => void;
  highlight: HighlightMode;
}) => {
  if (cell.th) {
    let extra = undefined;
    if (typeof highlight !== "string" && !cell.metaTh) {
      if (
        (highlight.type === "row" && cell.row === highlight.value) ||
        (highlight.type === "col" && cell.col === highlight.value)
      ) {
        extra = (
          <span
            style={{
              marginLeft: 4,
              fontWeight: "normal",
              fontSize: "0.9em",
              verticalAlign: "top",
              color: gold[5],
            }}
          >
            <FontAwesomeIcon icon={faHighlighter} />
          </span>
        );
      }
    }

    return (
      <th
        style={cell.style}
        rowSpan={cell.rowspan}
        colSpan={cell.colspan}
        onClick={(e) => onClick(cell)}
        className={cell.className}
      >
        <span>{cell.label}</span>
        {extra}
      </th>
    );
  }

  return <DataCellComponent cell={cell} />;
};

export const DataCellComponent = ({ cell }: { cell: ExtraCell }) => {
  const style: React.CSSProperties = {};
  const tdStyle: React.CSSProperties = { ...cell.style, position: "relative" };
  if (cell.highlight.bold) {
    style.fontWeight = "bold";
  }
  let highlightEl = undefined;
  if (cell.highlight.mode === "dot") {
    highlightEl = (
      <div
        style={{
          backgroundColor: cell.highlight.color,
          width: 8,
          height: 8,
          borderRadius: 4,
          position: "absolute",
          top: 3,
          right: 4,
        }}
      ></div>
    );
  } else if (cell.highlight.mode === "text") {
    style.color = cell.highlight.color;
  }

  const label = cell.label;

  // const label = Number.isNaN(cell.rawvalue!.mean)
  //   ? ""
  //   : cell.rawvalue!.mean.toFixed(3);

  return (
    <td
      style={tdStyle}
      rowSpan={cell.rowspan}
      colSpan={cell.colspan}
      className={cell.className}
    >
      {highlightEl}
      <span style={style}>{label}</span>
    </td>
  );
};

export function precomputeCellLabel(cell: Cell) {
  if (cell.th) return cell.label;

  const mean = _.mean(cell.datapoints.map((dp) => dp.recordValue as number));
  return mean.toFixed(3);
}

export function highlightTable(
  table: Table<ExtraCell>,
  highlight: HighlightMode
): Table<ExtraCell> {
  return table;
}
