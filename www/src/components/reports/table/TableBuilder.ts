import _ from "lodash";
import { BaseCell, BaseTable } from "../basetable";
import {
  AttrValue,
  Index,
  IndexElement,
  ReportData,
  ReportDataPoint,
} from "../ReportData";

export class Table<C extends BaseCell<ReportDataPoint[]>> extends BaseTable<
  C,
  ReportDataPoint[]
> {
  rowstart: number;
  colstart: number;
  nExtraRowHeaderCol: number;
  nExtraColHeaderRow: number;
  rowHeaderScale: number;
  colHeaderScale: number;

  constructor(
    data: C[][],
    nrows: number,
    ncols: number,
    rowstart: number,
    colstart: number,
    nExtraRowHeaderCol: number,
    nExtraColHeaderRow: number,
    rowHeaderScale: number,
    colHeaderScale: number
  ) {
    super(data, nrows, ncols);
    this.rowstart = rowstart;
    this.colstart = colstart;
    this.nExtraRowHeaderCol = nExtraRowHeaderCol;
    this.nExtraColHeaderRow = nExtraColHeaderRow;
    this.rowHeaderScale = rowHeaderScale;
    this.colHeaderScale = colHeaderScale;
  }

  clone() {
    return new Table(
      this.data.map((row) => row.map((cell) => ({ ...cell }))),
      this.nrows,
      this.ncols,
      this.rowstart,
      this.colstart,
      this.nExtraRowHeaderCol,
      this.nExtraColHeaderRow,
      this.rowHeaderScale,
      this.colHeaderScale
    );
  }
}

export class TableBuilder<C extends BaseCell<ReportDataPoint[]>> {
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
          const cell: Partial<BaseCell<ReportDataPoint[]>> = { row: i, col: j };
          row.push(Object.assign(colHeaders[i][j - colstart], cell));
        } else if (i >= rowstart && j < colstart - nExtraRowHeaderCol) {
          const cell: Partial<BaseCell<ReportDataPoint[]>> = { row: i, col: j };
          row.push(Object.assign(rowHeaders[i - rowstart][j], cell));
        } else {
          const cell: Partial<BaseCell<ReportDataPoint[]>> = {
            th: i < rowstart || j < colstart ? true : false,
            metaTh: false,
            label: "",
            colSpan: 1,
            rowSpan: 1,
            row: i,
            col: j,
            data: [],
          };
          row.push(Object.assign(this.cellFactory(), cell));
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
      rows[i][j].data.push(record);
    }
    return new Table(
      rows,
      nrows,
      ncols,
      rowstart,
      colstart,
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
        const cell: Partial<BaseCell<ReportDataPoint[]>> = {
          th: true,
          metaTh: true,
          label: "",
          colSpan: 1,
          rowSpan: 1,
          row: i,
          col: j,
        };
        row.push(Object.assign(this.cellFactory(), cell));
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
    header.colSpan = index.size() * scale;

    for (const [value, nextValues] of index.children.entries()) {
      headers[rowoffset + 1][coloffset].th = true;
      headers[rowoffset + 1][coloffset].metaTh = false;
      headers[rowoffset + 1][coloffset].label = value;
      if (nextValues.length === 0) {
        headers[rowoffset + 1][coloffset].colSpan = 1 * scale;
        headers[rowoffset + 1][coloffset].rowSpan = height - rowoffset - 1;
        coloffset += scale;
      } else {
        headers[rowoffset + 1][coloffset].colSpan =
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
          rowSpan: cell.colSpan,
          colSpan: cell.rowSpan,
        };
      });
    });
  }
}
