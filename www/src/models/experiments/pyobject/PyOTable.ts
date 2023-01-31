import { PyOHtml, PyOListHtml } from "./PyOHtml";

export interface PyOTable {
  type: "table";
  header: string[];
  rows: PyOTableRow[];
}

export interface PyOTableRow {
  [key: string]: PyOTableCell;
}

export type PyOTableCell = PyOTablePrimitiveCell | PyOHtml | PyOListHtml;

export type PyOTablePrimitiveCell = string | number | boolean | null;
