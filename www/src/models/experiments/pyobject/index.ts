import { PyOTable } from "./PyOTable";
import { PyOHtml, PyOListHtml } from "./PyOHtml";

export type PyObject = PyOTable | PyOHtml | PyOListHtml;

export * from "./PyOTable";
export * from "./PyOHtml";
