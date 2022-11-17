import { ClassNameMap, makeStyles } from "@mui/styles";
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
import { Experiment } from "models";

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
    minWidth: 640,
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
});

type NoneExpIndexSchema = {
  index: string[];
  values: (string | number | boolean | null)[];
};
// array to maintain expid order
type ExpIndexSchema = {
  expid: number;
  expname: string;
  index: string[];
  values: (string | number | boolean | null)[];
}[];
type IndexSchema = NoneExpIndexSchema | ExpIndexSchema;
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
  xitems: (string | number | boolean)[][];
  yitems: (string | number | boolean)[][];
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
      setData(res.data);
    });
  }, []);

  let [builder, table] = useMemo(() => {
    const builder = new ReportTableBuilder(data, classes);
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
  if (cell.data) {
    return <CellValue cell={cell} />;
  }

  return (
    <td
      style={cell.style}
      rowSpan={cell.rowspan}
      colSpan={cell.colspan}
      className={cell.className}
    >
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

  const label = Number.isNaN(cell.rawvalue!.mean)
    ? ""
    : cell.rawvalue!.mean.toFixed(3);

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

interface Cell {
  // whether the cell is a header
  th: boolean;
  // whether the cell is a header, but for describing the other headers (containing the real index)
  metaTh: boolean;
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
  colIndices: (string | number | boolean)[][];
  rowIndices: (string | number | boolean)[][];
  colIndexSchema: IndexSchema[];
  rowIndexSchema: IndexSchema[];
  rowIndexMap: { [key: string]: number };
  colIndexMap: { [key: string]: number };
  classes: ReturnType<typeof useStyles>;

  constructor(data: ReportTableData, classes: ReturnType<typeof useStyles>) {
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
    this.classes = classes;
  }

  cloneTable(table: Table): Table {
    const newTable: Cell[][] = [];
    for (const row of table.data) {
      newTable.push(row.map((cell) => ({ ...cell })));
    }
    return { ...table, data: newTable };
  }

  /**
   * Build the table.
   *
   * This most tricky part is to build the multi-level index into table headers. To aid the visual,
   * we also add a meta header to describe the index.
   *
   * For example, a table like this: (:<name> is a meta header, <name> is a normal header)
   * ---------------------------------------------------------------------------
   * |                   :exp1                   |         :exp2               |
   * |                :cgmethod                  |       :crmethod             |
   * |      pyserini       |       oracle        |  xgboost  |  random-forest  |
   * |--------------------------------------------                             |
   * |     :index-type     |     :index-type     |                             |
   * |  normal   enhanced  |  normal   enhanced  |                             |
   * ---------------------------------------------------------------------------
   *
   * will be built from the following procedure:
   *
   * 1. Determine number of cells for storing the headers, if we have exp index, then we need an extra one
   *    to specify the exp name.
   * 2. We build the header and meta header first, ignore an extra meta header for the exp name for now as we
   *    will attach it at the end.
   * 3. At each level, we need to figure out the span of the header and the meta header. The span of
   *    the header will be the product of the span of its children. The span of the meta header will be
   *    the sum of the span of its header. In order to calculate the span for exp, we need to know the
   *    range of exp before hand, which we can calculate using the same strategy above and knowing that headers of
   *    the same exp is contiguous.
   * 4.
   */
  build(): Table {
    const { colIndices, rowIndices } = this;
    const nAddedRows = colIndices.length > 0 ? colIndices[0].length : 0;
    const nAddedColumns = rowIndices.length > 0 ? rowIndices[0].length : 0;

    const hasRowExpIndices = this.rowIndexSchema.some(this.isExpIndexSchema);
    const hasColExpIndices = this.colIndexSchema.some(this.isExpIndexSchema);

    const rowstart = nAddedRows * 2 + (hasColExpIndices ? 1 : 0);
    const colstart = nAddedColumns * 2 + (hasRowExpIndices ? 1 : 0);
    const nrows = rowIndices.length + rowstart;
    const ncols = colIndices.length + colstart;

    const table: Cell[][] = [];
    for (let i = 0; i < nrows; i++) {
      const row = [];
      for (let j = 0; j < ncols; j++) {
        row.push({
          th: false,
          metaTh: false,
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

    // hide borders of useless cells at the top-left corner
    for (let i = 0; i < rowstart; i++) {
      for (let j = 0; j < colstart; j++) {
        table[i][j].style = {
          border: "none",
        };
      }
    }

    // build the multi-level row index
    const rowExpIndexRange: { expId: number; start: number; end: number }[] =
      [];
    // the default value ensure if there is no row exp, the extra col won't be added
    let rowFirstExpIndexLocation = nAddedColumns;
    if (hasRowExpIndices) {
      const rowFirstExpIndexLocation = this.rowIndexSchema.findIndex(
        this.isExpIndexSchema
      );
      const expIndexSchema = this.rowIndexSchema[
        rowFirstExpIndexLocation
      ] as ExpIndexSchema;
      expIndexSchema
        .map((schema) => [
          schema.expid,
          this.getHeaderSpan(
            schema.expid,
            rowFirstExpIndexLocation - 1,
            this.rowIndexSchema
          ),
        ])
        .forEach(([expId, span], i) => {
          if (i === 0) {
            rowExpIndexRange.push({ start: 0, end: span, expId });
          } else {
            const start = rowExpIndexRange[i - 1].end;
            rowExpIndexRange.push({ start, end: start + span, expId });
          }
        });
    }

    for (let i = rowstart; i < nrows; i++) {
      for (let j = 0; j < nAddedColumns; j++) {
        const rowindexmetadata = this.rowIndexSchema[j];
        const jshift = j >= rowFirstExpIndexLocation ? 1 : 0;
        table[i][jshift + j * 2] = {
          ...table[i][jshift + j * 2],
          th: true,
          metaTh: true,
          className: this.classes.metaRowHeader,
        };

        let cellRowSpan = 1;
        if (hasRowExpIndices) {
          const { expId, start, end } = this.getRange(j, rowExpIndexRange);
          const span = end - start;
          if ((i - rowstart) % span === 0) {
            table[i][jshift + j * 2].colspan = span;

            if (this.isExpIndexSchema(rowindexmetadata)) {
              // TODO: the ! signal an issue that if the nested experiment does not contain the experiment
              // of the parent, what happens?
              table[i][jshift + j * 2].label = rowindexmetadata
                .find((schema) => schema.expid === expId)!
                .index.join(".");
            } else {
              table[i][jshift + j * 2].label = rowindexmetadata.index.join(".");
            }
          }

          cellRowSpan = this.getHeaderSpan(expId, j, this.rowIndexSchema);
        } else {
          // render as if there is no exp
          const span = this.getHeaderSpan(
            undefined,
            j - 1,
            this.rowIndexSchema
          );
          if ((i - rowstart) % span === 0) {
            table[i][jshift + j * 2].label = (
              rowindexmetadata as NoneExpIndexSchema
            ).index.join(".");
            table[i][jshift + j * 2].rowspan = span;
          }

          cellRowSpan = this.getHeaderSpan(undefined, j, this.rowIndexSchema);
        }

        table[i][jshift + j * 2 + 1] = {
          ...table[i][jshift + j * 2 + 1],
          th: true,
          label: rowIndices[i - rowstart][j].toString(),
          className: this.classes.rowHeader,
          rowspan: (i - rowstart) % cellRowSpan === 0 ? cellRowSpan : 1,
        };
      }
    }

    if (hasRowExpIndices) {
      // add the extra experiment name col
      const j = rowFirstExpIndexLocation;
      let i = rowstart;
      rowExpIndexRange.forEach(({ expId, start, end }, iprime) => {
        const span = end - start;
        const cell = table[i][j * 2];
        table[i][j * 2] = {
          ...cell,
          th: true,
          metaTh: true,
          className: this.classes.metaRowHeader,
          label: (
            this.rowIndexSchema[rowFirstExpIndexLocation] as ExpIndexSchema
          )[iprime].expname,
          rowspan: span,
        };
        i += span;
      });
    }

    // build the multi-level col index
    const colExpIndexRange: { expId: number; start: number; end: number }[] =
      [];
    // the default value ensure if there is no col exp, the extra row won't be added
    let colFirstExpIndexLocation = nAddedRows;
    if (hasColExpIndices) {
      colFirstExpIndexLocation = this.colIndexSchema.findIndex(
        this.isExpIndexSchema
      );
      const expIndexSchema = this.colIndexSchema[
        colFirstExpIndexLocation
      ] as ExpIndexSchema;
      expIndexSchema
        .map((schema) => {
          return [
            schema.expid,
            this.getHeaderSpan(
              schema.expid,
              colFirstExpIndexLocation - 1,
              this.colIndexSchema
            ),
          ];
        })
        .forEach(([expId, span], i) => {
          if (i === 0) {
            colExpIndexRange.push({ start: 0, end: span, expId });
          } else {
            const start = colExpIndexRange[i - 1].end;
            colExpIndexRange.push({ start, end: start + span, expId });
          }
        });
    }

    for (let i = 0; i < nAddedRows; i++) {
      for (let j = colstart; j < ncols; j++) {
        const colindexmetadata = this.colIndexSchema[i];
        const ishift = i >= colFirstExpIndexLocation ? 1 : 0;
        table[ishift + i * 2][j] = {
          ...table[ishift + i * 2][j],
          th: true,
          metaTh: true,
          className: this.classes.metaColHeader,
        };

        let cellColspan = 1;
        if (hasColExpIndices) {
          const { expId, start, end } = this.getRange(i, colExpIndexRange);
          const span = end - start;
          if ((j - colstart) % span === 0) {
            table[ishift + i * 2][j].colspan = span;

            if (this.isExpIndexSchema(colindexmetadata)) {
              // TODO: the ! signal an issue that if the nested experiment does not contain the experiment
              // of the parent, what happens?
              table[ishift + i * 2][j].label = colindexmetadata
                .find((schema) => schema.expid === expId)!
                .index.join(".");
            } else {
              table[ishift + i * 2][j].label = colindexmetadata.index.join(".");
            }
          }

          cellColspan = this.getHeaderSpan(expId, i, this.colIndexSchema);
        } else {
          // render as if there is no exp
          const span = this.getHeaderSpan(
            undefined,
            i - 1,
            this.colIndexSchema
          );
          if ((j - colstart) % span === 0) {
            table[ishift + i * 2][j].label = (
              colindexmetadata as NoneExpIndexSchema
            ).index.join(".");
            table[ishift + i * 2][j].colspan = span;
          }

          cellColspan = this.getHeaderSpan(undefined, i, this.colIndexSchema);
        }

        table[ishift + i * 2 + 1][j] = {
          ...table[ishift + i * 2 + 1][j],
          th: true,
          label: colIndices[j - colstart][i].toString(),
          className: this.classes.colHeader,
          colspan: (j - colstart) % cellColspan === 0 ? cellColspan : 1,
        };
      }
    }

    if (hasColExpIndices) {
      // add the extra experiment name row
      const i = colFirstExpIndexLocation;
      let j = colstart;
      colExpIndexRange.forEach(({ expId, start, end }, jprime) => {
        const span = end - start;
        const cell = table[i * 2][j];
        table[i * 2][j] = {
          ...cell,
          th: true,
          metaTh: true,
          className: this.classes.metaColHeader,
          label: (
            this.colIndexSchema[colFirstExpIndexLocation] as ExpIndexSchema
          )[jprime].expname,
          colspan: span,
        };
        j += span;
      });
    }

    const output = { data: table, nrows, ncols, rowstart, colstart };
    // this.printTable(output);
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
      if (new Set(values.map((value) => value.name)).size > 1) {
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

  /**
   * Get the span (length) at the level.
   *
   * @param expId
   * @param level
   * @param schemas
   * @returns
   */
  protected getHeaderSpan(
    expId: number | undefined,
    level: number,
    schemas: IndexSchema[]
  ) {
    if (level < -1) {
      throw new Error("level must be >= -1");
    }

    const nvalues = schemas.map((schema) => {
      // if we have exp schema, expId must be not undefined
      return this.isExpIndexSchema(schema)
        ? schema.filter((item) => item.expid === expId)[0].values.length
        : schema.values.length;
    });

    let span = 1;
    for (let i = level + 1; i < nvalues.length; i++) {
      span *= nvalues[i];
    }
    return span;
  }

  protected isExpIndexSchema(schema: IndexSchema): schema is ExpIndexSchema {
    return Array.isArray(schema);
  }

  protected getRange<R extends { start: number; end: number }>(
    index: number,
    range: R[]
  ): R {
    for (let i = 0; i < range.length; i++) {
      if (index >= range[i].start && index < range[i].end) {
        return range[i];
      }
    }

    console.error({ index, range });
    throw new Error("Unreachable");
  }

  protected printTable(table: Table) {
    for (let i = 0; i < table.nrows; i++) {
      let row = "";
      for (let j = 0; j < table.ncols; j++) {
        const cell = table.data[i][j];
        row += `th:${cell.th ? 1 : 0} - span:${cell.rowspan}:${
          cell.colspan
        } - label:${cell.label.padEnd(20)} |  `;
      }
      console.log(row);
    }
  }
}
