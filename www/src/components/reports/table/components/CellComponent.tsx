import { gold } from "@ant-design/colors";
import { faHighlighter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AttrValue, ReportDataPoint } from "components/reports/ReportData";
import _ from "lodash";
import { AttrGetter } from "models/reports";
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

  return (
    <td
      style={tdStyle}
      rowSpan={cell.rowspan}
      colSpan={cell.colspan}
      className={cell.className}
    >
      {highlightEl}
      <span style={style}>{cell.label}</span>
    </td>
  );
};

export function precomputeCellLabel(
  table: Table<ExtraCell>,
  zvalues: [number | null, AttrGetter[]][],
  style: "column" | "embedded"
) {
  const zLabels = zvalues.flatMap(([_, attrs]) =>
    attrs.map((attr) => attr.attr.getLabel())
  );

  for (let i = table.rowstart; i < table.nrows; i += table.rowHeaderScale) {
    for (let j = table.colstart; j < table.ncols; j += table.colHeaderScale) {
      const cell = table.data[i][j];
      if (cell.datapoints.length === 0) {
        cell.rowspan = table.rowHeaderScale;
        cell.colspan = table.colHeaderScale;
        cell.label = "-";
        continue;
      }

      const datapoints: { [zvalue: string]: AttrValue[] } = {};
      for (const dp of cell.datapoints) {
        const z = dp.z.getLabel();
        if (datapoints[z] === undefined) {
          datapoints[z] = [];
        }
        datapoints[z].push(dp.recordValue);
      }

      if (style === "column") {
        zLabels.forEach((zLabel, k) => {
          if (!datapoints[zLabel].some(Number.isNaN)) {
            table.data[i + k][j].label = _.mean(datapoints[zLabel]).toFixed(3);
          } else {
            if (datapoints[zLabel].length === 1) {
              const zvalue = datapoints[zLabel][0];
              table.data[i + k][j].label =
                zvalue === null ? "null" : zvalue.toString();
            } else {
              table.data[i + k][j].label = datapoints[zLabel].join(", ");
            }
          }
        });
      } else {
        throw new Error("Not implemented");
      }
    }
  }
}

export function highlightTable(
  table: Table<ExtraCell>,
  highlight: HighlightMode
): Table<ExtraCell> {
  return table;
}
