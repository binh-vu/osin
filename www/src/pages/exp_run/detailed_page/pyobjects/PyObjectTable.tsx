import { Render, TableComponent } from "components/TableComponent";
import { PyObject } from "models/experiments/ExperimentRunData";

export const PyObjectTable = ({ object }: { object: PyObject }) => {
  let columns = object.columns.map((column, index) => {
    return {
      title: column,
      dataIndex: ["row", index],
      render: Render.auto as any,
    };
  });

  return (
    <TableComponent
      toolBarRender={false}
      query={async (limit, offset) => {
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
      }}
      columns={columns}
    />
  );
};
