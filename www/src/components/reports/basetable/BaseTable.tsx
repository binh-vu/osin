import { ClassNameMap } from "@mui/styles";
import { getClassName } from "misc";
import { BaseCell, BaseData } from "./BaseCell";

export class BaseTable<C extends BaseCell<D>, D> {
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
   * Get a cell by its position in the table. This is useful when the structure of the table has been changed
   * such as after fixSpanning.
   */
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
   *
   * Note that this function implies when the cell is spanned, the cell on the right/below must be removed regardless
   * of its span.
   */
  fixSpanning() {
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

  /**
   * Group cells by grouping options. This function can be used to highlight cells in a table
   *
   * Note: it only works for tables before fixSpanning is called as fixSpanning removes cells and the
   * table is no longer a 2D matrix.
   */
  grouping(
    mode: "row" | "col",
    options: {
      rowstep?: number;
      colstep?: number;
      rowstart?: number;
      colstart?: number;
      rowend?: number;
      colend?: number;
    }
  ) {
    const groups = [];
    const rowstep = options.rowstep || 1;
    const colstep = options.colstep || 1;
    const rowstart = options.rowstart || 0;
    const colstart = options.colstart || 0;
    const rowend = options.rowend || this.nrows;
    const colend = options.colend || this.ncols;

    if (mode === "row") {
      for (let i = rowstart; i < rowend; i += rowstep) {
        for (let k = 0; k < colstep; k++) {
          const group = [];
          for (let j = colstart + k; j < colend; j += colstep) {
            group.push(this.data[i][j]);
          }
          groups.push(group);
        }
      }
    } else {
      for (let j = colstart; j < colend; j += colstep) {
        for (let k = 0; k < rowstep; k++) {
          const group = [];
          for (let i = rowstart + k; i < rowend; i += rowstep) {
            group.push(this.data[i][j]);
          }
          groups.push(group);
        }
      }
    }
    return groups;
  }
}
