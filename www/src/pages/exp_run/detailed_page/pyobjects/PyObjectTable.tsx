import { Render, TableComponent } from "components/table";
import {
  PyOTable,
  PyOTableCell,
  PyOTableRow,
} from "models/experiments/pyobject";
import { PyObjectComponent } from "./PyObject";

type WrappedPyOTableRow = { id: number; row: PyOTableRow };

export const PyObjectTable = ({ object }: { object: PyOTable }) => {
  let columns =
    object.rows.length === 0
      ? []
      : Object.keys(object.rows[0]).map((column) => {
          return {
            title: column,
            key: `row.${column}`,
            dataIndex: ["row", column],
            render: (
              value: PyOTableCell,
              record: WrappedPyOTableRow,
              recordIndex: number
            ) => {
              if (typeof value !== "object" || value === null) {
                return Render.auto(value);
              } else {
                return <PyObjectComponent object={value} />;
              }
            },
          };
        });

  return (
    <TableComponent
      rowKey="id"
      showRowIndex={true}
      defaultPageSize={20}
      store={{
        query: async (limit, offset) => {
          return {
            records: object.rows
              .slice(offset, offset + limit)
              .map((row, index) => {
                return {
                  id: offset + index,
                  row,
                };
              }),
            total: object.rows.length,
          };
        },
      }}
      columns={columns}
    />
  );
};
