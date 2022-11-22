import AsciiTable from "ascii-table";
import { ReportData } from "../ReportData";
import { testcase01 } from "../resources/testcase01";
import { testcase02 } from "../resources/testcase02";
import { testcase03 } from "../resources/testcase03";
import { Cell, cellFactory, Table, TableBuilder } from "./TableBuilder";

describe("test table builder", () => {
  let testcases = [testcase01, testcase02];
  testcases = [testcase03];

  test("construct table header", () => {
    for (const testcase of testcases) {
      const builder = new TableBuilder(
        ReportData.deserialize(testcase.reportData.data),
        cellFactory
      );
      const headers = builder.buildHeader(
        builder.data.xIndex,
        testcase.colHeaderScale
      );
      expect(filters.map(filters.filterCell)(headers)).toEqual(
        testcase.rowHeaders
      );

      const headers2 = builder.buildHeader(
        builder.data.yIndex,
        testcase.rowHeaderScale
      );
      expect(filters.map(filters.filterCell)(headers2)).toEqual(
        testcase.colHeaders
      );
    }
  });

  test("construct table", () => {
    for (const testcase of testcases) {
      const builder = new TableBuilder(
        ReportData.deserialize(testcase.reportData.data),
        cellFactory
      );
      const table = builder.build(
        testcase.nExtraRowHeaderCol,
        testcase.nExtraColHeaderRow,
        testcase.rowHeaderScale,
        testcase.colHeaderScale
      );
      expect(tableToString(table)).toEqual(testcase.tableStructure);
    }
  });

  test("fix spanning", () => {
    for (const testcase of testcases) {
      if (testcase.spannedCells === undefined) {
        continue;
      }

      const builder = new TableBuilder(
        ReportData.deserialize(testcase.reportData.data),
        cellFactory
      );
      const table = builder.build(
        testcase.nExtraRowHeaderCol,
        testcase.nExtraColHeaderRow,
        testcase.rowHeaderScale,
        testcase.colHeaderScale
      );
      table.fixSpanning();
      expect(filters.map(filters.filterCell)(table.data)).toEqual(
        testcase.spannedCells
      );
    }
  });
});

const filters = {
  map: (filter: (x: any) => any) => {
    return (arr: any[] | any[][]) => {
      return arr.map((x) => {
        if (Array.isArray(x)) {
          return x.map(filter);
        } else {
          return filter(x);
        }
      });
    };
  },
  filterCell: (cell: Cell) => {
    return {
      label: cell.label,
      colspan: cell.colspan,
      rowspan: cell.rowspan,
    };
  },
};

const tableToString = (table: Table<Cell>) => {
  const tbl = new AsciiTable();
  for (let row of table.data) {
    tbl.addRow(row.map((r) => r.label));
  }

  return tbl.toString();
};
