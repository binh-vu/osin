import { blue, gold, green, red } from "@ant-design/colors";
import { faHighlighter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AttrValue, ReportDataPoint } from "components/reports/ReportData";
import _ from "lodash";
import { AttrGetter } from "models/reports";
import { Table } from "./TableBuilder";
import Rainbow from "rainbowvis.js";
import { Descriptions, Typography } from "antd";
import { useMemo } from "react";
import { TableComponent } from "components/table";
import { HighlightMode } from "./ReportTableRenderConfig";
import { BaseCell } from "../basetable/BaseTableComponent";

export interface Cell extends BaseCell<ReportDataPoint[]> {
  // for highlighting cell, not put in style because
  // we want to be flexible in terms of how to highlight
  highlight: {
    mode?: "dot" | "text";
    color?: string;
    bold?: boolean;
  };
  // the value that is used to highlight
  highlightValue?: number;
}

export const cellFactory = (): Cell => {
  return {
    th: false,
    metaTh: false,
    label: "",
    colSpan: 1,
    rowSpan: 1,
    row: 0,
    col: 0,
    highlight: {},
    data: [],
  };
};

export const CellComponent = ({
  table,
  cell,
  onClick,
  highlight,
}: {
  table: Table<Cell>;
  cell: Cell;
  onClick: (cell: Cell) => void;
  highlight: HighlightMode;
}) => {
  if (cell.th) {
    let extra = undefined;
    if (typeof highlight !== "string" && !cell.metaTh) {
      // add col/row span to detect the leaf nodes so as we may have imbalance index tree
      if (
        (highlight.type === "row" &&
          cell.row === highlight.value &&
          cell.col + cell.colSpan === table.colstart) ||
        (highlight.type === "col" &&
          cell.col === highlight.value &&
          cell.row + cell.rowSpan === table.rowstart)
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
        rowSpan={cell.rowSpan}
        colSpan={cell.colSpan}
        onClick={(e) => onClick(cell)}
        className={cell.className}
      >
        <span>{cell.label.toString()}</span>
        {extra}
      </th>
    );
  }

  return <DataCellComponent cell={cell} onClick={onClick} />;
};

export const DataCellComponent = ({
  cell,
  onClick,
}: {
  cell: Cell;
  onClick: (cell: Cell) => void;
}) => {
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
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
      className={cell.className}
      onClick={(e) => onClick(cell)}
    >
      {highlightEl}
      <span style={style}>{cell.label}</span>
    </td>
  );
};

export const CellStatistics = ({
  table,
  cell,
  zvalues,
  zstyle,
  renderRecordId,
}: {
  table: Table<Cell>;
  cell: Cell;
  zvalues: [number | null, AttrGetter[]][];
  zstyle: "column" | "row" | "embedded";
  renderRecordId?: (recordId: number) => React.ReactNode;
}) => {
  // TODO: this code is written in a hurry, surely will contain bugs
  const zLabels = useMemo(() => {
    return zvalues.flatMap(([_, attrs]) =>
      attrs.map((attr) => attr.attr.asString())
    );
  }, [zvalues]);

  let realcell: Cell;
  let zLabel: string;
  let zLabelIndex;
  if (zstyle === "column") {
    zLabelIndex = (cell.col - table.colstart) % table.colHeaderScale;
    zLabel = zLabels[zLabelIndex];
    realcell = table.data[cell.row][cell.col - zLabelIndex];
  } else if (zstyle === "row") {
    zLabelIndex = (cell.row - table.rowstart) % table.rowHeaderScale;
    zLabel = zLabels[zLabelIndex];
    realcell = table.data[cell.row - zLabelIndex][cell.col];
  } else if (zstyle === "embedded") {
    const ki = (cell.row - table.rowstart) % table.rowHeaderScale;
    const kj = (cell.col - table.colstart) % table.colHeaderScale;
    zLabelIndex = kj + ki * table.colHeaderScale;
    zLabel = zLabels[zLabelIndex];
    realcell = table.data[cell.row - ki][cell.col - kj];
  } else {
    throw new Error(`unreachable! invalid z-value style: ${zstyle}`);
  }

  const datapoints: { [zvalue: string]: ReportDataPoint[] } = useMemo(() => {
    const datapoints: { [zvalue: string]: ReportDataPoint[] } = {};
    for (const dp of realcell.data) {
      const z = dp.z.asString();
      if (datapoints[z] === undefined) {
        datapoints[z] = [];
      }
      datapoints[z].push(dp);
    }
    return datapoints;
  }, [realcell]);

  const zDataPoints = datapoints[zLabel] || [];

  const stats = useMemo(() => {
    if (zDataPoints.some(Number.isNaN)) {
      return { mean: "", max: "", min: "" };
    }
    const lst = zDataPoints.map((dp) => dp.recordValue);
    return {
      mean: _.mean(lst),
      max: _.max(lst),
      min: _.min(lst),
    };
  }, [datapoints, zLabel]);

  return (
    <>
      <Descriptions title="Cell Statistics">
        <Descriptions.Item label="Mean">{stats.mean}</Descriptions.Item>
        <Descriptions.Item label="Max">{stats.max}</Descriptions.Item>
        <Descriptions.Item label="Min">{stats.min}</Descriptions.Item>
      </Descriptions>
      <Typography.Title level={5} style={{ fontWeight: "bold" }}>
        Data Points
      </Typography.Title>
      <TableComponent
        key={`${cell.row}-${cell.col}`}
        selectRows={false}
        rowKey="recordId"
        defaultPageSize={50}
        store={{
          query: async (limit, offset, conditions, sortedBy) => {
            return {
              records: zDataPoints.slice(offset, offset + limit),
              total: zDataPoints.length,
            };
          },
        }}
        columns={[
          {
            key: "recordId",
            dataIndex: "recordId",
            title: "Run",
            width: "max-content",
            fixed: "left",
            render: renderRecordId,
          },
          {
            key: "recordValue",
            dataIndex: "recordValue",
            title: "Value",
            width: "max-content",
            fixed: "left",
          },
        ]}
      />
    </>
  );
};

export function imputeCellData(
  table: Table<Cell>,
  zvalues: [number | null, AttrGetter[]][],
  style: "column" | "row" | "embedded"
) {
  const zLabels = zvalues.flatMap(([_, attrs]) =>
    attrs.map((attr) => attr.attr.getLabel())
  );

  if (zLabels.length > 1) {
    if (style === "column") {
      // add z labels to the last extra column header row
      for (let j = table.colstart; j < table.ncols; j += table.colHeaderScale) {
        for (let k = 0; k < zLabels.length; k++) {
          table.data[table.rowstart - 1][j + k].label = zLabels[k];
        }
      }
    } else if (style === "row") {
      // add z labels to the last extra row header column
      for (let i = table.rowstart; i < table.nrows; i += table.rowHeaderScale) {
        for (let k = 0; k < zLabels.length; k++) {
          table.data[i + k][table.colstart - 1].label = zLabels[k];
        }
      }
    }
  }

  for (let i = table.rowstart; i < table.nrows; i += table.rowHeaderScale) {
    for (let j = table.colstart; j < table.ncols; j += table.colHeaderScale) {
      const cell = table.data[i][j];
      if (cell.data.length === 0) {
        cell.rowSpan = table.rowHeaderScale;
        cell.colSpan = table.colHeaderScale;
        cell.label = "-";
        continue;
      }

      const datapoints: { [zvalue: string]: AttrValue[] } = {};
      for (const dp of cell.data) {
        const z = dp.z.getLabel();
        if (datapoints[z] === undefined) {
          datapoints[z] = [];
        }
        datapoints[z].push(dp.recordValue);
      }

      if (style === "column") {
        zLabels.forEach((zLabel, k) => {
          if (!datapoints[zLabel].some(Number.isNaN)) {
            const mean = _.mean(datapoints[zLabel]);
            table.data[i][j + k].highlightValue = mean;
            table.data[i][j + k].label = mean.toFixed(3);
          } else {
            if (datapoints[zLabel].length === 1) {
              const zvalue = datapoints[zLabel][0];
              table.data[i][j + k].label =
                zvalue === null ? "null" : zvalue.toString();
            } else {
              table.data[i][j + k].label = datapoints[zLabel].join(", ");
            }
          }
        });
      } else if (style === "row") {
        zLabels.forEach((zLabel, k) => {
          if (!datapoints[zLabel].some(Number.isNaN)) {
            const mean = _.mean(datapoints[zLabel]);
            table.data[i + k][j].highlightValue = mean;
            table.data[i + k][j].label = mean.toFixed(3);
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
      } else if (style === "embedded") {
        zLabels.forEach((zLabel, k) => {
          const kj = k % table.colHeaderScale;
          const ki = (k - kj) / table.colHeaderScale;
          if (!datapoints[zLabel].some(Number.isNaN)) {
            const mean = _.mean(datapoints[zLabel]);
            table.data[i + ki][j + kj].highlightValue = mean;
            table.data[i + ki][j + kj].label = mean.toFixed(3);
          } else {
            if (datapoints[zLabel].length === 1) {
              const zvalue = datapoints[zLabel][0];
              table.data[i + ki][j + kj].label =
                zvalue === null ? "null" : zvalue.toString();
            } else {
              table.data[i + ki][j + kj].label = datapoints[zLabel].join(", ");
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
  table: Table<Cell>,
  highlight: HighlightMode
): Table<Cell> {
  if (
    highlight === "none" ||
    table.ncols - table.colstart === 0 ||
    table.nrows - table.rowstart === 0
  ) {
    return table;
  }

  const rainbow = new Rainbow();
  rainbow.setSpectrum("#b7eb8f", "#237804");
  rainbow.setNumberRange(0, 1000);

  for (let i = table.rowstart; i < table.nrows; i++) {
    for (let j = table.colstart; j < table.ncols; j++) {
      table.data[i][j].highlight = {};
    }
  }

  const isHighlightTheBest =
    typeof highlight === "string" && highlight.endsWith("-best");
  const groups = highlightGrouping(table, highlight);
  for (const group of groups) {
    const values = group.group
      .filter((cell) => cell.highlightValue !== undefined)
      .map((cell) => cell.highlightValue);

    let min = _.min(values)!;
    let max = _.max(values)!;
    const realmax = max;

    // most metrics are between 0 and 1, so until we have a better way to know the range
    // of the metrics, we use this heuristics.
    if (max <= 1 && min >= 0) {
      min = 0;
      max = 1;
    }

    let interval = max - min;
    if (interval === 0 || values.length === 1) {
      // only highlight when we have more than one value and when the values are different
      continue;
    }

    if (
      group.pivotCell !== undefined &&
      group.pivotCell.highlightValue === undefined
    ) {
      continue;
    }

    for (const cell of group.group) {
      if (cell.highlightValue === undefined) {
        continue;
      }
      if (group.pivotCell === undefined) {
        const newvalue = ((cell.highlightValue - min) / interval) * 1000;
        // show the dot, but seems like it's difficult to see when we just want to
        // highlight the best, so just use text mode when highlighting the best
        cell.highlight = {
          color: isHighlightTheBest
            ? undefined
            : "#" + rainbow.colorAt(newvalue),
          bold: cell.highlightValue === realmax,
          mode: "dot",
        };
      } else {
        cell.highlight = {
          bold: true,
          mode: "text",
        };
        if (cell.highlightValue > group.pivotCell.highlightValue!) {
          cell.highlight.color = red[5];
        } else if (cell.highlightValue < group.pivotCell.highlightValue!) {
          cell.highlight.color = green[5];
        } else {
          cell.highlight.color = blue[5];
        }
      }
    }
  }

  return table;
}

function highlightGrouping(
  table: Table<Cell>,
  highlight: HighlightMode
): { group: Cell[]; pivotCell?: Cell }[] {
  // leverage the fact that rowHeaderScale & colHeaderScale is calculated based on zstyle
  // and if we have to calculate it again, the formula is the same and we also require the
  // knowledge of how zstyle is used, so don't repeat the code here.
  const rowstep = table.rowHeaderScale;
  const colstep = table.colHeaderScale;
  const groups = [];

  // each row is a group, compare the values in the same row
  // since each row is a group, rowstep does not matter here (the step is used to jump between zvalues
  // so any value between the step is a new group and because each row is already consider as a new group
  // this has no effect and can be ignore)
  // Note that when we highlight a column, we compare each value of that column to values of the other
  // columns in the same row, so it is grouping by row.
  const isHighlightAColumn =
    typeof highlight !== "string" && highlight.type === "col";
  const isGroupingByRow =
    highlight === "row" || highlight === "row-best" || isHighlightAColumn;
  if (isGroupingByRow) {
    let pivotCell = undefined;
    let kprime = isHighlightAColumn
      ? (highlight.value - table.colstart) % colstep
      : -1;
    for (let i = table.rowstart; i < table.nrows; i++) {
      for (let k = 0; k < colstep; k++) {
        if (isHighlightAColumn) {
          if (k !== kprime) continue;
          pivotCell = table.data[i][highlight.value];
        }
        const group = [];
        for (let j = table.colstart + k; j < table.ncols; j += colstep) {
          group.push(table.data[i][j]);
        }
        groups.push({ group, pivotCell });
      }
    }
    return groups;
  }

  // each col is a group, compare the values in the same col
  // similarly, colstep does not matter here
  const isHighlightARow =
    typeof highlight !== "string" && highlight.type === "row";
  const isGroupingByCol =
    highlight === "col" || highlight === "col-best" || isHighlightARow;
  if (isGroupingByCol) {
    let pivotCell = undefined;
    let kprime = isHighlightARow
      ? (highlight.value - table.rowstart) % rowstep
      : -1;
    for (let j = table.colstart; j < table.ncols; j++) {
      for (let k = 0; k < rowstep; k++) {
        if (isHighlightARow) {
          if (k !== kprime) continue;
          pivotCell = table.data[highlight.value][j];
        }
        const group = [];
        for (let i = table.rowstart + k; i < table.nrows; i += rowstep) {
          group.push(table.data[i][j]);
        }
        groups.push({ group, pivotCell });
      }
    }
    return groups;
  }

  // happen when highlight is "none" so we do nothing
  return [];
}
