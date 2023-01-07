import { SanitizedHTML } from "components/SanitizedHTML";
import { Render, TableComponent } from "components/table";
import {
  PyOTable,
  PyOTableRow,
  PyOTableCell,
} from "models/experiments/pyobject";

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
              } else if (value.type === "html") {
                return <SanitizedHTML html={value.value} />;
              }
            },
          };
        });

  return (
    <TableComponent
      rowKey="id"
      defaultPageSize={5}
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
