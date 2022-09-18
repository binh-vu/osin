import { observer } from "mobx-react";
import { TableComponent } from "../../../components/TableComponent";
import { ExperimentRun, useStores } from "../../../models";

export const ExampleExplorer = observer(
  ({ expRun }: { expRun: ExperimentRun }) => {
    const { expRunStore } = useStores();

    return (
      <TableComponent
        selectRows={true}
        scroll={{ x: "max-content" }}
        query={async (limit, offset) => {
          let res = await expRunStore.fetchByExp(exp, offset, limit);
          return res;
        }}
        columns={columns}
      />
    );
  }
);
