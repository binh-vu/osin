export interface PyOTable {
  type: "table";
  rows: PyOTableRow[];
}

export interface PyOTableRow {
  [key: string]: PyOTableCell;
}

export type PyOTableCell = PyOTableHTMLCell | PyOTablePrimitiveCell;

export type PyOTablePrimitiveCell = string | number | boolean | null;

export interface PyOTableHTMLCell {
  type: "html";
  value: string;
}
