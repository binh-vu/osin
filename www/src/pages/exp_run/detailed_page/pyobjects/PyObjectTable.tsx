import { Render, TableComponent, TableComponentFunc } from "components/table";
import {
  getTextSearchFilterProps,
  sortRecords,
} from "components/table/ColumnFilter";
import Fuse from "fuse.js";
import _ from "lodash";
import memoizeOne from "memoize-one";
import { action, makeObservable, observable, toJS } from "mobx";
import { observer } from "mobx-react";
import {
  PyOTable,
  PyOTableCell,
  PyOTableRow,
} from "models/experiments/pyobject";
import { useContext, useEffect, useRef } from "react";
import Highlighter from "react-highlight-words";
import { OpenStateStore } from "../ExampleExplorer";
import { PyObjectComponent } from "./PyObject";

type WrappedPyOTableRow = { id: number; row: PyOTableRow };

class PyObjectTableStore {
  rows: PyOTableRow[];
  filteredRows: PyOTableRow[];
  sortRecords: (
    records: PyOTableRow[],
    sorts: {
      field: keyof PyOTableRow;
      order: "desc" | "asc";
    }[]
  ) => PyOTableRow[];
  columns: [string, number][];
  queries: string[];
  fuses: Fuse<any>[];

  constructor(rows: PyOTableRow[], header: string[]) {
    this.columns = header.map((column, i) => [column, i]);

    this.rows = rows;
    this.filteredRows = rows;
    this.sortRecords = memoizeOne(sortRecords);
    this.queries = this.columns.map(() => "");
    this.fuses = [];

    makeObservable(this, {
      rows: observable,
      filteredRows: observable,
      queries: observable,
      exactsearch: action,
      fuzzysearch: action,
    });
  }

  exactsearch = () => {
    const queryColumns = this.columns.filter(
      ([column, i]) => this.queries[i].length > 0
    );
    this.filteredRows = this.rows.filter((row) => {
      return queryColumns.every(([column, i]) => {
        return (row[column] || "")
          .toString()
          .toLowerCase()
          .includes(this.queries[i].toLowerCase());
      });
    });
  };

  fuzzysearch = () => {
    if (this.queries.every((q) => q === "")) {
      this.filteredRows = this.rows;
      return;
    }
    const results = [];
    for (const [i, query] of this.queries.entries()) {
      if (query.length === 0) continue;
      if (this.fuses[i] === undefined) {
        this.fuses[i] = new Fuse(this.rows, {
          keys: [this.columns[i][0]],
        });
      }
      results.push(this.fuses[i].search(query).map((x) => x.refIndex));
    }
    this.filteredRows = _.intersection(...results).map((i) => this.rows[i]);
  };
}

export const PyObjectTable = observer(
  ({ id, object }: { id: string; object: PyOTable }) => {
    const openStateStore = useContext(OpenStateStore);
    let pyObjectTableStore: PyObjectTableStore;
    if ((openStateStore as any).pyobjecttables === undefined) {
      (openStateStore as any).pyobjecttables = new Map();
    }
    if ((openStateStore as any).pyobjecttables.has(id)) {
      pyObjectTableStore = (openStateStore as any).pyobjecttables.get(id)!;
    } else {
      (openStateStore as any).pyobjecttables.set(
        id,
        new PyObjectTableStore(object.rows, object.header)
      );
      pyObjectTableStore = (openStateStore as any).pyobjecttables.get(id);
    }

    const tableRef = useRef<TableComponentFunc<WrappedPyOTableRow>>(null);

    let columns =
      object.rows.length === 0
        ? []
        : object.header.map((column, columnIndex) => {
            const filterProps = getTextSearchFilterProps(
              pyObjectTableStore.queries[columnIndex],
              (query) => {
                pyObjectTableStore.queries[columnIndex] = query;
              },
              () => {
                pyObjectTableStore.exactsearch();
                // doing reload here as useEffect is triggered multiple times at the beginning
                // regardless of the dependency array in VirtualTable.
                if (tableRef.current !== null) {
                  tableRef.current.reload();
                }
              }
            );
            return {
              title: column,
              key: `row.${column}`,
              dataIndex: ["row", column],
              sorter: { multiple: 1 },
              render: (
                value: PyOTableCell,
                record: WrappedPyOTableRow,
                recordIndex: number
              ) => {
                if (typeof value !== "object" || value === null) {
                  const newvalue = Render.auto(value);
                  if (
                    pyObjectTableStore.queries[columnIndex].length > 0 &&
                    typeof newvalue === "string"
                  ) {
                    return (
                      <Highlighter
                        highlightStyle={{
                          backgroundColor: "#ffc069",
                          padding: 0,
                        }}
                        searchWords={[pyObjectTableStore.queries[columnIndex]]}
                        autoEscape
                        textToHighlight={newvalue}
                      />
                    );
                  }
                  return newvalue;
                } else {
                  return (
                    <PyObjectComponent
                      id={`${id}-${recordIndex}-${columnIndex}`}
                      object={value}
                    />
                  );
                }
              },
              ...filterProps,
            };
          });

    return (
      <TableComponent
        ref={tableRef}
        rowKey="id"
        showRowIndex={true}
        defaultPageSize={20}
        store={{
          query: async (limit, offset, conditions, sorts) => {
            return {
              records: pyObjectTableStore
                .sortRecords(
                  pyObjectTableStore.filteredRows,
                  sorts.map((sort) => ({
                    field: sort.field.substring(4), // remove "row."
                    order: sort.order,
                  }))
                )
                .slice(offset, offset + limit)
                .map((row, index) => {
                  return {
                    id: offset + index,
                    row,
                  };
                }),
              total: pyObjectTableStore.filteredRows.length,
            };
          },
        }}
        columns={columns}
      />
    );
  }
);
