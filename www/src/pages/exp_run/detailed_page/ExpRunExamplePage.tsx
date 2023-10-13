import { LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { TableColumn } from "components/table/Columns";
import { ExperimentRun, useStores } from "models";
import { routes } from "../../../routes";
import { ExampleData } from "models/experiments/ExperimentRunData";
import { createContext } from "react";
import { TableComponent } from "components/table";
import { useRemainingHeight } from "components/table/tableHelperHooks";
import { FixedSizeMap } from "misc/FixedSizeMap";
import { useMemo, useRef, useState } from "react";
import { ExpandableCell, data2columns } from "./ExampleExplorer";

const defaultColumns: TableColumn<ExampleData>[] = [
  {
    key: "id",
    dataIndex: "id",
    title: "ID",
    sorter: true,
  },
  {
    key: "name",
    dataIndex: "name",
    title: "Name",
    sorter: true,
  },
];

export const OpenStateStore = createContext({});

export const ExpRunExamplePage = observer(() => {
  let tmp = routes.runWithExpIdWithExampleId.useURLParams()!;
  let runId: number = tmp.runId;
  let exampleId: number = tmp.exampleId;

  const { expStore, expRunStore } = useStores();

  useEffect(() => {
    expRunStore.fetchById(runId).then((exprun) => {
      if (exprun !== undefined) {
        expStore.fetchById(exprun.expId);
      }
    });
  }, [expStore, expRunStore, runId]);

  const exprun = expRunStore.get(runId);
  if (exprun === undefined) {
    return <LoadingComponent />;
  } else if (exprun === null) {
    return <NotFoundComponent />;
  }

  const exp = expStore.get(exprun.expId);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }

  return <ExampleViewer exprun={exprun} exampleOffset={exampleId} />;
});

export const ExampleViewer = observer(
  ({
    exprun,
    exampleOffset,
  }: {
    exampleOffset: number;
    exprun: ExperimentRun;
  }) => {
    const { expRunStore } = useStores();
    const [openStateStore, setOpenStateStore] = useState({});
    const [selectedExampleTab, setSelectedExampleTab] = useState<
      FixedSizeMap<string, string>
    >(FixedSizeMap.withCapacity(24));

    const columns = useMemo(() => {
      let extraColumns = [];
      if (exprun.dataTracker.individual.primitive.keys.length > 0) {
        extraColumns.push(
          data2columns(
            "Data",
            ["data", "primitive"],
            exprun.data.individual.get(
              exprun.dataTracker.individual.primitive.keys[0]
            )!.data.primitive
          )
        );
      }

      return defaultColumns.concat(extraColumns);
    }, [exprun.dataTracker.individual.primitive.keys[0]]);

    return (
      <OpenStateStore.Provider value={openStateStore}>
        <TableComponent
          selectRows={false}
          rowKey="id"
          store={{
            query: async (limit, offset, conditions, sortedBy) => {
              await expRunStore.fetchExpRunData(
                exprun,
                {
                  aggregated: {},
                  individual: {
                    primitive: true,
                  },
                },
                1,
                exampleOffset,
                sortedBy.length > 0 ? sortedBy[0] : undefined
              );

              let records: ExampleData[] = [];
              exprun.dataTracker
                .getIndividualPrimitiveKeys(1, exampleOffset)
                .forEach((exampleId) => {
                  records.push(exprun.data.individual.get(exampleId)!);
                });

              return {
                records,
                total: 1,
              };
            },
          }}
          columns={columns}
          expandable={{
            rowExpandable: (record: ExampleData) => record.data.n_complex > 0,
            expandedRowRender: (
              record: ExampleData,
              recordIndex: number,
              indent: number
            ) => {
              return (
                <ExpandableCell
                  key={record.id}
                  exprun={exprun}
                  record={record}
                  indent={indent}
                  selectedExampleTab={selectedExampleTab}
                  setSelectedExampleTab={setSelectedExampleTab}
                />
              );
            },
          }}
        />
      </OpenStateStore.Provider>
    );
  }
);
