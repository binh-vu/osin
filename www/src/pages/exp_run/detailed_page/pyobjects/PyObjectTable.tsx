import { Render, TableComponent } from "components/table";
import { PyObject } from "models/experiments/ExperimentRunData";

export const PyObjectTable = ({ object }: { object: PyObject }) => {
  let columns =
    object.rows.length === 0
      ? []
      : Object.keys(object.rows[0]).map((column) => {
          return {
            title: column,
            key: `row.${column}`,
            dataIndex: ["row", column],
            render: Render.auto as any,
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
