import _ from "lodash";
import {
  AttrValue,
  Index,
  IndexElement,
  ReportData,
  ReportDataPoint,
} from "../ReportData";

export interface Cell {
  className?: string;
  style?: React.CSSProperties;
  label: string | number;
  row: number;
  col: number;
  colspan: number;
  rowspan: number;
  // data points associated with this cell
  datapoints: ReportDataPoint[];

  // whether the cell is a header
  th: boolean;
  // whether the cell is a header, but for describing the other headers (containing the real index)
  metaTh: boolean;
}

export class Table<C extends Cell> {
  data: C[][];
  rowstart: number;
  colstart: number;
  nrows: number;
  ncols: number;
  nExtraRowHeaderCol: number;
  nExtraColHeaderRow: number;
  rowHeaderScale: number;
  colHeaderScale: number;

  constructor(
    data: C[][],
    rowstart: number,
    colstart: number,
    nrows: number,
    ncols: number,
    nExtraRowHeaderCol: number,
    nExtraColHeaderRow: number,
    rowHeaderScale: number,
    colHeaderScale: number
  ) {
    this.data = data;
    this.rowstart = rowstart;
    this.colstart = colstart;
    this.nrows = nrows;
    this.ncols = ncols;
    this.nExtraRowHeaderCol = nExtraRowHeaderCol;
    this.nExtraColHeaderRow = nExtraColHeaderRow;
    this.rowHeaderScale = rowHeaderScale;
    this.colHeaderScale = colHeaderScale;
  }

  clone() {
    return new Table(
      this.data.map((row) => row.map((cell) => ({ ...cell }))),
      this.rowstart,
      this.colstart,
      this.nrows,
      this.ncols,
      this.nExtraRowHeaderCol,
      this.nExtraColHeaderRow,
      this.rowHeaderScale,
      this.colHeaderScale
    );
  }

  /** Get a cell by its position in the table. This is useful when the structure of the table has been changed */
  getCell = (row: number, col: number): C => {
    for (let i = 0; i < this.data.length; i++) {
      for (let j = 0; j < this.data[i].length; j++) {
        const cell = this.data[i][j];
        if (cell.row === row && cell.col === col) {
          return cell;
        }
      }
    }
    throw new Error("Cell not found");
  };

  /**
   * For html table spanning to work correctly, if the cell is column spanned, then the cell on the right
   * must be removed. If the cell is row spanned, then the cell below must be removed.
   *
   * This simple algorithm works by first creating a flag table, in which each cell is marked as false
   * if it is supposted to be removed. Then the table is traversed from top to bottom, left to right, and
   * remove the cell if it is marked as true.
   */
  fixSpanning(): Table<C> {
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
        if (cell.rowspan === 1 && cell.colspan === 1) {
          continue;
        }
        for (let u = 0; u < cell.rowspan; u++) {
          for (let v = 0; v < cell.colspan; v++) {
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

export class TableBuilder<C extends Cell> {
  data: ReportData;
  xIndexMap: Map<string, number>;
  yIndexMap: Map<string, number>;
  cellFactory: () => C;

  constructor(data: ReportData, cellFactory: () => C) {
    this.data = data;

    this.xIndexMap = new Map();
    let offset = 0;
    for (const index of data.xIndex) {
      this.buildIndexMap(index, { map: this.xIndexMap, offset });
      offset += index.size();
    }
    this.yIndexMap = new Map();
    offset = 0;
    for (const index of data.yIndex) {
      this.buildIndexMap(index, { map: this.yIndexMap, offset });
      offset += index.size();
    }
    this.cellFactory = cellFactory;
  }

  build(
    nExtraRowHeaderCol: number = 0,
    nExtraColHeaderRow: number = 0,
    rowHeaderScale: number = 1,
    colHeaderScale: number = 1
  ): Table<C> {
    const colHeaders = this.buildHeader(this.data.xIndex, colHeaderScale);
    const rowHeaders = this.transposeHeadersToVertical(
      this.buildHeader(this.data.yIndex, rowHeaderScale)
    );

    const rowstart = colHeaders.length + nExtraColHeaderRow;
    const colstart =
      (rowHeaders.length > 0 ? rowHeaders[0].length : 0) + nExtraRowHeaderCol;
    const nrows = rowstart + rowHeaders.length;
    const ncols = colstart + (colHeaders.length > 0 ? colHeaders[0].length : 0);

    const rows: C[][] = [];
    for (let i = 0; i < nrows; i++) {
      const row: C[] = [];
      for (let j = 0; j < ncols; j++) {
        if (i < rowstart - nExtraColHeaderRow && j >= colstart) {
          row.push(
            Object.assign(colHeaders[i][j - colstart], { row: i, col: j })
          );
        } else if (i >= rowstart && j < colstart - nExtraRowHeaderCol) {
          row.push(
            Object.assign(rowHeaders[i - rowstart][j], { row: i, col: j })
          );
        } else {
          row.push({
            ...this.cellFactory(),
            th: i < rowstart || j < colstart ? true : false,
            metaTh: false,
            label: "",
            colspan: 1,
            rowspan: 1,
            row: i,
            col: j,
            datapoints: [],
          });
        }
      }
      rows.push(row);
    }

    for (let i = 0; i < rowstart; i++) {
      for (let j = 0; j < colstart; j++) {
        rows[i][j].th = true;
      }
    }

    for (const record of this.data.data) {
      const i =
        this.yIndexMap.get(record.y.toString())! * rowHeaderScale + rowstart;
      const j =
        this.xIndexMap.get(record.x.toString())! * colHeaderScale + colstart;
      rows[i][j].datapoints.push(record);
    }

    return new Table(
      rows,
      rowstart,
      colstart,
      nrows,
      ncols,
      nExtraRowHeaderCol,
      nExtraColHeaderRow,
      rowHeaderScale,
      colHeaderScale
    );
  }

  /** Build (meta) headers of the table from an index */
  buildHeader(indices: Index[], scale: number = 1): C[][] {
    const heights = indices.map((index) => index.getMaxLevel());
    const widths = indices.map((index) => index.size());
    const height = _.max(heights)!;
    const width = _.sum(widths);

    const headers: C[][] = [];
    for (let i = 0; i < height * 2; i++) {
      const row = [];
      for (let j = 0; j < width * scale; j++) {
        row.push({
          ...this.cellFactory(),
          th: true,
          metaTh: true,
          label: "",
          colspan: 1,
          rowspan: 1,
          row: i,
          col: j,
          datapoints: [],
        });
      }
      headers.push(row);
    }

    let offset = 0;
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      this.buildHeaderMain(index, 0, offset, headers, scale);
      offset += widths[i];
    }
    return headers;
  }

  /** Build an index that maps from index's element to row/col in the table */
  protected buildIndexMap(
    index: Index,
    output?: { map: Map<string, number>; offset: number },
    element?: AttrValue[]
  ): Map<string, number> {
    if (output === undefined) {
      output = {
        map: new Map(),
        offset: 0,
      };
    }
    if (element === undefined) {
      element = [];
    }
    for (const [value, nextValues] of index.children.entries()) {
      const nextElement = [...element, value];
      if (nextValues.length === 0) {
        output.map.set(new IndexElement(nextElement).toString(), output.offset);
        output.offset++;
      } else {
        for (const nextValue of nextValues) {
          this.buildIndexMap(nextValue, output, nextElement);
        }
      }
    }
    return output.map;
  }

  protected buildHeaderMain(
    index: Index,
    rowoffset: number,
    coloffset: number,
    headers: C[][],
    scale: number = 1
  ) {
    const header = headers[rowoffset][coloffset];
    const height = headers.length;
    header.th = true;
    header.metaTh = true;
    header.label = index.attr.getLabel();
    header.colspan = index.size() * scale;

    for (const [value, nextValues] of index.children.entries()) {
      headers[rowoffset + 1][coloffset].th = true;
      headers[rowoffset + 1][coloffset].metaTh = false;
      headers[rowoffset + 1][coloffset].label = value;
      if (nextValues.length === 0) {
        headers[rowoffset + 1][coloffset].colspan = 1 * scale;
        headers[rowoffset + 1][coloffset].rowspan = height - rowoffset - 1;
        coloffset += scale;
      } else {
        headers[rowoffset + 1][coloffset].colspan =
          nextValues.map((nv) => nv.size()).reduce((a, b) => a + b) * scale;
        for (const nextValue of nextValues) {
          this.buildHeaderMain(
            nextValue,
            rowoffset + 2,
            coloffset,
            headers,
            scale
          );
          coloffset += nextValue.size() * scale;
        }
      }
    }
  }

  private transposeHeadersToVertical(cells: C[][]): C[][] {
    if (cells.length === 0) {
      return [];
    }

    return cells[0].map((_, j) => {
      return cells.map((_, i) => {
        const cell = cells[i][j];
        return {
          ...cell,
          row: cell.col,
          col: cell.row,
          rowspan: cell.colspan,
          colspan: cell.rowspan,
        };
      });
    });
  }
}

export const cellFactory = (): Cell => {
  return {
    th: false,
    metaTh: false,
    label: "",
    colspan: 1,
    rowspan: 1,
    row: 0,
    col: 0,
    datapoints: [],
  };
};
