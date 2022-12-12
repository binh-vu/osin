import AsciiTable from "ascii-table";
import { BaseReport } from "models/reports";
import { BaseCell } from "../basetable";
import { ReportData, ReportDataPoint } from "../ReportData";
import { testcase01 } from "../resources/testcase01";
import { testcase02 } from "../resources/testcase02";
import { testcase03 } from "../resources/testcase03";
import { Table, TableBuilder } from "./TableBuilder";

const cellFactory = (): BaseCell<ReportDataPoint[]> => {
  return {
    th: false,
    metaTh: false,
    label: "",
    colSpan: 1,
    rowSpan: 1,
    row: 0,
    col: 0,
    data: [],
    style: {},
  };
};

describe("test table builder", () => {
  let basereport = BaseReport.default();
  let testcases = [testcase01, testcase02, testcase03];
  // testcases = [testcase01];

  test("construct table header", () => {
    for (const testcase of testcases) {
      const builder = new TableBuilder(
        ReportData.deserialize(testcase.reportData.data, basereport),
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
        ReportData.deserialize(testcase.reportData.data, basereport),
        cellFactory
      );
      const table = builder.build(
        testcase.nExtraRowHeaderCol,
        testcase.nExtraColHeaderRow,
        testcase.rowHeaderScale,
        testcase.colHeaderScale
      );
      expect(tableToString(table)).toEqual(testcase.tableStructure);
      expect(table.nrows).toEqual(table.data.length);
      expect(table.ncols).toEqual(table.data[0].length);
      for (let i = 0; i < table.nrows; i++) {
        for (let j = 0; j < table.ncols; j++) {
          const cell = table.data[i][j];
          expect(cell.row).toEqual(i);
          expect(cell.col).toEqual(j);
        }
      }
    }
  });

  test("fix spanning", () => {
    for (const testcase of testcases) {
      if (testcase.spannedCells === undefined) {
        continue;
      }

      const builder = new TableBuilder(
        ReportData.deserialize(testcase.reportData.data, basereport),
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
  filterCell: (cell: BaseCell<ReportDataPoint[]>) => {
    return {
      label: cell.label,
      colSpan: cell.colSpan,
      rowSpan: cell.rowSpan,
    };
  },
};

const tableToString = (table: Table<BaseCell<ReportDataPoint[]>>) => {
  const tbl = new AsciiTable();
  for (let row of table.data) {
    tbl.addRow(row.map((r) => r.label));
  }

  return tbl.toString();
};
