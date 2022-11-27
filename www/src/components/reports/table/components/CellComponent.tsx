import { blue, gold, green, red, yellow } from "@ant-design/colors";
import { faHighlighter } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AttrValue, ReportDataPoint } from "components/reports/ReportData";
import _ from "lodash";
import { AttrGetter } from "models/reports";
import { Cell, cellFactory, Table } from "../TableBuilder";
import Rainbow from "rainbowvis.js";
import { Filter } from "misc";
import { Descriptions, Typography } from "antd";
import { useMemo } from "react";
import { TableComponent } from "components/table";
import { InternalLink } from "gena-app";
import { routes } from "routes";
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
  // the value that is used to highlight
  highlightValue?: number;
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
        (highlight.type === "row" &&
          cell.row === highlight.value &&
          cell.col === table.colstart - 1) ||
        (highlight.type === "col" &&
          cell.col === highlight.value &&
          cell.row === table.rowstart - 1)
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

  return <DataCellComponent cell={cell} onClick={onClick} />;
};

export const DataCellComponent = ({
  cell,
  onClick,
}: {
  cell: ExtraCell;
  onClick: (cell: ExtraCell) => void;
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
      rowSpan={cell.rowspan}
      colSpan={cell.colspan}
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
  table: Table<ExtraCell>;
  cell: ExtraCell;
  zvalues: [number | null, AttrGetter[]][];
  zstyle: "column" | "embedded";
  renderRecordId?: (recordId: number) => React.ReactNode;
}) => {
  // TODO: this code is written in a hurry, surely will contain bugs
  const zLabels = useMemo(() => {
    return zvalues.flatMap(([_, attrs]) =>
      attrs.map((attr) => attr.attr.asString())
    );
  }, [zvalues]);

  let realcell: ExtraCell;
  let zLabel: string;
  let zLabelIndex;
  if (zstyle === "column") {
    zLabelIndex = (cell.col - table.colstart) % table.colHeaderScale;
    zLabel = zLabels[zLabelIndex];
    realcell = table.data[cell.row][cell.col - zLabelIndex];
  } else {
    throw new Error("not implemented");
  }

  const datapoints: { [zvalue: string]: ReportDataPoint[] } = useMemo(() => {
    const datapoints: { [zvalue: string]: ReportDataPoint[] } = {};
    for (const dp of realcell.datapoints) {
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
  table: Table<ExtraCell>,
  zvalues: [number | null, AttrGetter[]][],
  style: "column" | "embedded"
) {
  const zLabels = zvalues.flatMap(([_, attrs]) =>
    attrs.map((attr) => attr.attr.getLabel())
  );

  if (style === "column" && zLabels.length > 1) {
    // add z labels to the last extra column header row
    for (let j = table.colstart; j < table.ncols; j += table.colHeaderScale) {
      for (let k = 0; k < zLabels.length; k++) {
        table.data[table.rowstart - 1][j + k].label = zLabels[k];
      }
    }
  }

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
      } else {
        throw new Error("Not implemented");
      }
    }
  }
}

export function highlightTable(
  table: Table<ExtraCell>,
  highlight: HighlightMode,
  zvalues: [number | null, AttrGetter[]][],
  zstyle: "column" | "embedded"
): Table<ExtraCell> {
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

  const zLabels = zvalues.flatMap(([_, attrs]) =>
    attrs.map((attr) => attr.attr.getLabel())
  );

  for (let i = table.rowstart; i < table.nrows; i++) {
    for (let j = table.colstart; j < table.ncols; j++) {
      table.data[i][j].highlight = {};
    }
  }

  // treat each row indepedently, compare the values in the same row
  if (highlight === "row" || highlight === "row-best") {
    if (zstyle !== "column") {
      throw new Error("Not implemented");
    }

    const nGroups = zLabels.length;
    for (let i = table.rowstart; i < table.nrows; i++) {
      for (let k = 0; k < nGroups; k++) {
        const values = [];
        for (let j = table.colstart + k; j < table.ncols; j += nGroups) {
          if (table.data[i][j].highlightValue === undefined) {
            continue;
          }
          values.push(table.data[i][j].highlightValue);
        }
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
        if (interval === 0) {
          continue;
        }

        for (let j = table.colstart + k; j < table.ncols; j += nGroups) {
          const value = table.data[i][j].highlightValue;
          if (value === undefined) continue;
          const newvalue = ((value - min) / interval) * 1000;
          table.data[i][j].highlight = {
            color:
              highlight === "row-best"
                ? undefined
                : "#" + rainbow.colorAt(newvalue),
            bold: value === realmax,
            mode: "dot",
          };
        }
      }
    }
  }

  // treat each column indepedently, compare the values in the same column
  if (highlight === "col" || highlight === "col-best") {
    if (zstyle !== "column") {
      throw new Error("Not implemented");
    }

    for (let j = table.colstart; j < table.ncols; j++) {
      const values = [];
      for (let i = table.rowstart; i < table.nrows; i++) {
        if (table.data[i][j].highlightValue === undefined) {
          continue;
        }
        values.push(table.data[i][j].highlightValue);
      }
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
      if (interval === 0) {
        continue;
      }

      for (let i = table.rowstart; i < table.nrows; i++) {
        const value = table.data[i][j].highlightValue;
        if (value === undefined) {
          continue;
        }
        const newvalue = ((value - min) / interval) * 1000;
        table.data[i][j].highlight = {
          color:
            highlight === "col-best"
              ? undefined
              : "#" + rainbow.colorAt(newvalue),
          bold: value === realmax,
          mode: "dot",
        };
      }
    }
  }

  if (typeof highlight !== "string") {
    if (highlight.type === "col") {
      // this is opposite to the other highlight modes, highlight a particular column treat each row indepedently
      // and use a particular value at the column to compare to the values in the other column of the same row
      if (zstyle !== "column") {
        throw new Error("Not implemented");
      }
      const nGroups = zLabels.length;
      const k = (highlight.value - table.colstart) % nGroups;

      for (let i = table.rowstart; i < table.nrows; i++) {
        const cmp = table.data[i][highlight.value].highlightValue;
        if (cmp === undefined) continue;
        table.data[i][highlight.value].highlight = {
          color: blue[6],
          bold: true,
          mode: "text",
        };
        for (let j = table.colstart + k; j < table.ncols; j += nGroups) {
          const value = table.data[i][j].highlightValue;
          if (value === undefined) continue;
          if (value > cmp) {
            table.data[i][j].highlight = {
              color: red[5],
              bold: true,
              mode: "text",
            };
          } else if (value < cmp) {
            table.data[i][j].highlight = {
              color: green[5],
              bold: true,
              mode: "text",
            };
          }
        }
      }
    }
    if (highlight.type === "row") {
      if (zstyle !== "column") {
        throw new Error("Not implemented");
      }
      const nGroups = zLabels.length;

      for (let k = 0; k < nGroups; k++) {
        for (let j = table.colstart + k; j < table.ncols; j++) {
          const cmp = table.data[highlight.value][j].highlightValue;
          if (cmp === undefined) continue;
          table.data[highlight.value][j].highlight = {
            color: blue[6],
            bold: true,
            mode: "text",
          };
          for (let i = table.rowstart; i < table.nrows; i++) {
            const value = table.data[i][j].highlightValue;
            if (value === undefined) continue;
            if (value > cmp) {
              table.data[i][j].highlight = {
                color: red[6],
                bold: true,
                mode: "text",
              };
            } else if (value < cmp) {
              table.data[i][j].highlight = {
                color: green[6],
                bold: true,
                mode: "text",
              };
            }
          }
        }
      }
    }
  }

  return table;
}
