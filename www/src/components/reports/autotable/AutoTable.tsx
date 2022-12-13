import { ArrayHelper } from "misc";
import { BaseCell, BaseTable, BaseData, BaseDataWithID } from "../basetable";

export class CellData extends BaseDataWithID {
  static default() {
    return new CellData([], []);
  }
}

export interface Cell extends BaseCell<CellData> {}

export class AutoTable extends BaseTable<Cell, CellData> {
  attrHeaderWidth: number;
  valueHeaderHeight: number;
  groupRanges: { start: number; end: number; name: string }[];

  constructor(
    data: Cell[][],
    nrows: number,
    ncols: number,
    attrHeaderWidth: number,
    valueHeaderHeight: number,
    groupRanges: { start: number; end: number; name: string }[]
  ) {
    super(data, nrows, ncols);
    this.attrHeaderWidth = attrHeaderWidth;
    this.valueHeaderHeight = valueHeaderHeight;
    this.groupRanges = groupRanges;
  }

  clone() {
    return new AutoTable(
      this.data.map((row) => row.map((cell) => ({ ...cell }))),
      this.nrows,
      this.ncols,
      this.attrHeaderWidth,
      this.valueHeaderHeight,
      this.groupRanges.map((range) => ({ ...range }))
    );
  }

  /**
   * Whether the cell is the leaf value header.
   *
   * Note: this function will return true twice for a column that the leaf value header is not the last row.
   * Therefore, it must be called from top to bottom, so that we can stop after the first hit.
   * @param cell
   */
  isLeafValueHeaderCell(cell: Cell) {
    return (
      cell.th &&
      cell.row < this.valueHeaderHeight &&
      cell.col >= this.attrHeaderWidth &&
      (cell.rowSpan > 1 || cell.row === this.valueHeaderHeight - 1)
    );
  }

  sort(sorts: { column: number; order: "asc" | "desc" }[]) {
    const newsorts = sorts.map((s) => ({
      index: s.column,
      order: s.order,
    }));
    for (const groupRange of this.groupRanges) {
      ArrayHelper.sort(
        this.data,
        newsorts,
        groupRange.start,
        groupRange.end,
        (cell) => (cell.data.getNumericData() || { mean: "" }).mean
      );
    }
  }
}
