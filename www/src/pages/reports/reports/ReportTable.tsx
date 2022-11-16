import { makeStyles } from "@mui/styles";
import { Dropdown } from "antd";
import axios from "axios";
import { SERVER } from "env";
import { InternalLink } from "gena-app";
import _ from "lodash";
import { getClassName } from "misc";
import { ExpIndex, Index, Report, ReportTableArgs } from "models/reports";
import { useEffect, useMemo, useState } from "react";
import { routes } from "routes";
import { gold, green, red, yellow } from "@ant-design/colors";
import { HighlightFilled, HighlightOutlined } from "@ant-design/icons";
import Rainbow from "rainbowvis.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHighlighter } from "@fortawesome/free-solid-svg-icons";

const useStyles = makeStyles({
  root: {},
  table: {
    marginLeft: "auto",
    marginRight: "auto",
    border: "1px solid #ddd",
    "& td,th": {
      border: "1px solid #ddd",
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
});

type IndexSchema =
  | string[]
  | { values: (string | number | boolean | null)[]; expId: number }[];
interface ReportTableData {
  data: {
    x: string[];
    y: string[];
    z: {
      name: string[];
      value: number;
      run_id: number;
    }[];
  }[];
  xitems: string[][];
  yitems: string[][];
  // schema at each index level
  xitems_schema: IndexSchema[];
  yitems_schema: IndexSchema[];
}
type HighlightMode =
  | "none"
  | "row"
  | "col"
  | "a-col"
  | "a-row"
  | "row-best"
  | "col-best"
  | { type: "row"; value: number }
  | { type: "col"; value: number };
const highlightModes: HighlightMode[] = [
  "none",
  "row",
  "col",
  "row-best",
  "col-best",
];
const DEFAULT_HIGHLIGHT_MODE = "row-best";

export const ReportTable = ({
  expId,
  report,
}: {
  expId: number;
  report: Report;
}) => {
  const classes = useStyles();
  const tableargs = report.args as ReportTableArgs;
  const [data, setData] = useState<ReportTableData>({
    data: [],
    xitems: [],
    yitems: [],
    xitems_schema: [],
    yitems_schema: [],
  });
  const [highlight, setHighlight] = useState<HighlightMode>(
    DEFAULT_HIGHLIGHT_MODE
  );

  useEffect(() => {
    axios.get(`${SERVER}/api/report/${report.id}/data`).then((res) => {
      const mapfn = (
        indexschema: string[] | [number, (string | number | boolean | null)[]]
      ) => {
        if (Array.isArray(indexschema)) {
          return indexschema;
        } else {
          return {
            expId: indexschema[0],
            values: indexschema[1],
          };
        }
      };
      res.data.xitems_schema = res.data.xitems_schema.map(mapfn);
      res.data.yitems_schema = res.data.yitems_schema.map(mapfn);

      setData(res.data);
    });
  }, []);

  let [builder, table] = useMemo(() => {
    const builder = new ReportTableBuilder(data);
    return [builder, builder.build()];
  }, [data]);

  table = useMemo(() => {
    const newtable = builder.cloneTable(table);
    builder.highlight(newtable, highlight);
    builder.fixSpanning(newtable);
    return newtable;
  }, [builder, table, highlight]);

  const actions = (
    <>
      <InternalLink
        path={routes.updatereport}
        urlArgs={{ expId, reportId: report.id }}
        queryArgs={{}}
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

  let footnote = undefined;
  if (tableargs.value.zvalues.length === 1) {
    let metric = undefined;
    if (tableargs.value.zvalues[0] instanceof Index) {
      metric = tableargs.value.zvalues[0].index.join(".");
    } else {
      const tmp = new Set(
        Object.values(tableargs.value.zvalues[0].indices).map((idx) => {
          return idx instanceof Index ? idx.index.join(".") : idx;
        })
      );
      if (tmp.size === 1) {
        metric = tmp.values().next().value;
      }
    }
    if (metric !== undefined) {
      footnote = (
        <caption className={classes.footnote}>
          *each cell shows the average of {metric} - {actions}
        </caption>
      );
    }
  }
  if (footnote === undefined) {
    footnote = <caption className={classes.footnote}>{actions}</caption>;
  }

  const onCellClick = (cell: Cell) => {
    // do nothing if clicking on empty cells
    if (cell.row < table.rowstart && cell.col < table.colstart) return;

    if (cell.th) {
      // toggle highlight a column/row in a matrix
      if (cell.row < table.rowstart) {
        // clicking on a column header
        if (
          typeof highlight !== "string" &&
          highlight.type === "col" &&
          highlight.value === cell.col
        ) {
          setHighlight(DEFAULT_HIGHLIGHT_MODE);
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
          setHighlight(DEFAULT_HIGHLIGHT_MODE);
        } else {
          setHighlight({ type: "row", value: cell.row });
        }
      }
    }
  };

  return (
    <div className={classes.root}>
      <table className={getClassName(classes.table, classes.largeTable)}>
        <caption className={classes.caption}>
          Table {report.id}. {report.name}: {report.description}.
        </caption>
        <tbody>
          {table.data.map((row, ri) => {
            return (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  return (
                    <Cell
                      key={`${ri}-${ci}`}
                      cell={cell}
                      onClick={onCellClick}
                      highlight={highlight}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        {footnote}
      </table>
    </div>
  );
};

const Cell = ({
  cell,
  onClick,
  highlight,
}: {
  cell: Cell;
  onClick: (cell: Cell) => void;
  highlight: HighlightMode;
}) => {
  if (cell.th) {
    let extra = undefined;
    if (typeof highlight !== "string") {
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
      >
        <span>{cell.label}</span>
        {extra}
      </th>
    );
  }
  if (cell.data) {
    return <CellValue cell={cell} />;
  }

  return (
    <td style={cell.style} rowSpan={cell.rowspan} colSpan={cell.colspan}>
      <span>{cell.label}</span>
    </td>
  );
};

const CellValue = ({ cell }: { cell: Cell }) => {
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
    <td style={tdStyle} rowSpan={cell.rowspan} colSpan={cell.colspan}>
      {highlightEl}
      <span style={style}>{cell.rawvalue!.mean.toFixed(3)}</span>
    </td>
  );
};

interface Cell {
  // whether the cell is a header
  th: boolean;
  // whether the cell is a data cell and requires custom rendering
  data: boolean;
  label: string;
  className?: string;
  style?: React.CSSProperties;
  row: number;
  col: number;
  colspan: number;
  rowspan: number;
  // for highlighting cell, not put in style because
  // we want to be flexible in terms of how to highlight
  highlight: {
    mode?: "dot" | "text";
    color?: string;
    bold?: boolean;
  };
  // only for data cell (not header cells)
  rawvalue?: {
    mean: number;
    data: { name: string; value: number; run_id: number }[];
  };
}

interface Table {
  data: Cell[][];
  rowstart: number;
  colstart: number;
  nrows: number;
  ncols: number;
}

class ReportTableBuilder {
  data: {
    x: string;
    y: string;
    z: {
      name: string;
      value: number;
      run_id: number;
    }[];
  }[];
  colIndices: string[][];
  rowIndices: string[][];
  colIndexSchema: IndexSchema[];
  rowIndexSchema: IndexSchema[];
  rowIndexMap: { [key: string]: number };
  colIndexMap: { [key: string]: number };

  constructor(data: ReportTableData) {
    this.data = [];
    this.colIndices = data.xitems;
    this.rowIndices = data.yitems;
    this.colIndexSchema = data.xitems_schema;
    this.rowIndexSchema = data.yitems_schema;

    this.rowIndexMap = Object.fromEntries(
      this.rowIndices.map((idx, i) => [idx.join("."), i])
    );
    this.colIndexMap = Object.fromEntries(
      this.colIndices.map((idx, i) => [idx.join("."), i])
    );
    for (const r of data.data) {
      this.data.push({
        x: r.x.join("."),
        y: r.y.join("."),
        z: r.z.map((rz) => ({
          name: rz.name.join("."),
          value: rz.value,
          run_id: rz.run_id,
        })),
      });
    }
  }

  cloneTable(table: Table): Table {
    const newTable: Cell[][] = [];
    for (const row of table.data) {
      newTable.push(row.map((cell) => ({ ...cell })));
    }
    return { ...table, data: newTable };
  }

  /**
   * Build the table (haven't fixed the spanning for displaying yet as it should only be done
   * before rendering)
   */
  build(): Table {
    const { colIndices, rowIndices } = this;
    const nAddedRows = colIndices.length > 0 ? colIndices[0].length : 0;
    const nAddedColumns = rowIndices.length > 0 ? rowIndices[0].length : 0;

    const rowstart = nAddedRows * 2;
    const colstart = nAddedColumns * 2;
    const nrows = rowIndices.length + rowstart;
    const ncols = colIndices.length + colstart;

    const table: Cell[][] = [];
    for (let i = 0; i < nrows; i++) {
      const row = [];
      for (let j = 0; j < ncols; j++) {
        row.push({
          th: false,
          label: "",
          colspan: 1,
          rowspan: 1,
          data: false,
          highlight: {},
          row: i,
          col: j,
        });
      }
      table.push(row);
    }
    for (let i = 0; i < rowstart; i++) {
      for (let j = 0; j < colstart; j++) {
        table[i][j].style = {
          border: "none",
        };
      }
    }

    for (let i = rowstart; i < nrows; i++) {
      for (let j = 0; j < nAddedColumns; j++) {
        const rowindexmedata = this.rowIndexSchema[j];
        table[i][j * 2] = {
          ...table[i][j * 2],
          th: true,
          style: {
            borderRight: "none",
            transform: "rotate(-180deg)",
            writingMode: "vertical-lr",
            padding: 0,
          },
        };
        if (Array.isArray(rowindexmedata)) {
          table[i][j * 2].label = rowindexmedata.join(".");
          if (i === rowstart) {
            table[i][j * 2].rowspan = rowIndices.length;
          }
        } else {
          // how about the ExpIndex?
          throw new Error("not implemented");
        }
        table[i][j * 2 + 1] = {
          ...table[i][j * 2 + 1],
          th: true,
          label: rowIndices[i - rowstart][j],
          style: { borderLeft: "none" },
        };
      }
    }
    for (let i = 0; i < nAddedRows; i++) {
      for (let j = colstart; j < ncols; j++) {
        const colindexmetadata = this.colIndexSchema[i];
        table[i * 2][j] = {
          ...table[i * 2][j],
          th: true,
          style: { borderBottom: "none", padding: 0 },
        };

        if (Array.isArray(colindexmetadata)) {
          table[i * 2][j].label = colindexmetadata.join(".");
          if (j === colstart) {
            // we can set the colspan here so it doesn't repeat for each column
            table[i * 2][j].colspan = colIndices.length;
          }
        } else {
          // how about the ExpIndex?
          throw new Error("not implemented");
        }
        table[i * 2 + 1][j] = {
          ...table[i * 2 + 1][j],
          th: true,
          label: colIndices[j - colstart][i],
          style: {
            borderTop: "none",
          },
        };
      }
    }

    const output = { data: table, nrows, ncols, rowstart, colstart };
    this.addData(output);
    return output;
  }

  /**
   * For html table spanning to work correctly, if the cell is column spanned, then the cell on the right
   * must be removed. If the cell is row spanned, then the cell below must be removed.
   *
   * This simple algorithm works by first creating a flag table, in which each cell is marked as false
   * if it is supposted to be removed. Then the table is traversed from top to bottom, left to right, and
   * remove the cell if it is marked as true.
   */
  fixSpanning(table: Table) {
    if (table.data.length === 0) {
      return;
    }
    const flags: boolean[][] = [];

    for (let i = 0; i < table.nrows; i++) {
      flags.push([]);
      for (let j = 0; j < table.ncols; j++) {
        flags[i].push(true);
      }
    }

    for (let i = 0; i < table.nrows; i++) {
      for (let j = 0; j < table.ncols; j++) {
        const cell = table.data[i][j];
        for (let k = 1; k < cell.colspan; k++) {
          flags[i][j + k] = false;
        }
        for (let k = 1; k < cell.rowspan; k++) {
          flags[i + k][j] = false;
        }
      }
    }

    for (let i = 0; i < table.nrows; i++) {
      table.data[i] = table.data[i].filter((_, j) => flags[i][j]);
    }
  }

  highlight(table: Table, highlight: HighlightMode) {
    if (
      highlight === "none" ||
      table.ncols - table.colstart === 0 ||
      table.nrows - table.rowstart === 0
    ) {
      return;
    }

    const rainbow = new Rainbow();
    rainbow.setSpectrum("#b7eb8f", "#237804");
    rainbow.setNumberRange(0, 1000);

    for (let i = table.rowstart; i < table.nrows; i++) {
      for (let j = table.colstart; j < table.ncols; j++) {
        table.data[i][j].highlight = {};
      }
    }

    if (highlight === "row" || highlight === "row-best") {
      for (let i = table.rowstart; i < table.nrows; i++) {
        const values = table.data[i]
          .slice(table.colstart)
          .map((cell) => cell.rawvalue!.mean);
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

        values.forEach((value, j) => {
          const newvalue = ((value - min) / interval) * 1000;
          table.data[i][j + table.colstart].highlight = {
            color:
              highlight === "row-best"
                ? undefined
                : "#" + rainbow.colorAt(newvalue),
            bold: value === realmax,
            mode: "dot",
          };
        });
      }
    }

    if (highlight === "col" || highlight === "col-best") {
      for (let j = table.colstart; j < table.ncols; j++) {
        const values = [];
        for (let i = table.rowstart; i < table.nrows; i++) {
          values.push(table.data[i][j].rawvalue!.mean);
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

        values.forEach((value, i) => {
          const newvalue = ((value - min) / interval) * 1000;
          table.data[i + table.rowstart][j].highlight = {
            color:
              highlight === "col-best"
                ? undefined
                : "#" + rainbow.colorAt(newvalue),
            bold: value === realmax,
            mode: "dot",
          };
        });
      }
    }

    if (typeof highlight !== "string") {
      if (highlight.type === "col") {
        for (let i = table.rowstart; i < table.nrows; i++) {
          const cmp = table.data[i][highlight.value].rawvalue!.mean;
          for (let j = table.colstart; j < table.ncols; j++) {
            if (table.data[i][j].rawvalue!.mean > cmp) {
              table.data[i][j].highlight = {
                color: green[6],
                bold: true,
                mode: "text",
              };
            } else if (table.data[i][j].rawvalue!.mean < cmp) {
              table.data[i][j].highlight = {
                color: red[6],
                bold: true,
                mode: "text",
              };
            }
          }
        }
      }
      if (highlight.type === "row") {
        for (let j = table.colstart; j < table.ncols; j++) {
          const cmp = table.data[highlight.value][j].rawvalue!.mean;
          for (let i = table.rowstart; i < table.nrows; i++) {
            if (table.data[i][j].rawvalue!.mean > cmp) {
              table.data[i][j].highlight = {
                color: green[6],
                bold: true,
                mode: "text",
              };
            } else if (table.data[i][j].rawvalue!.mean < cmp) {
              table.data[i][j].highlight = {
                color: red[6],
                bold: true,
                mode: "text",
              };
            }
          }
        }
      }
    }
  }

  protected addData(table: Table) {
    if (table.data.length === 0) {
      return;
    }
    for (const record of this.data) {
      const { x: col, y: row, z: values } = record;
      const i = this.rowIndexMap[row] + table.rowstart;
      const j = this.colIndexMap[col] + table.colstart;
      if (new Set(values.map((value) => value.name)).size !== 1) {
        throw new Error("not implemented");
      }
      const justvalues = values.map((v) => v.value);
      table.data[i][j].data = true;
      table.data[i][j].rawvalue = {
        mean: _.mean(justvalues),
        data: values,
      };
    }
  }
}
