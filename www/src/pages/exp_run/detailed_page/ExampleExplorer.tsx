import { Tabs } from "antd";
import { Render, TableComponent } from "components/table";
import { TableColumn } from "components/table/Columns";
import { useRemainingHeight } from "components/table/tableHelperHooks";
import { FixedSizeMap } from "misc/FixedSizeMap";
import { observer } from "mobx-react";
import { ExperimentRun, useStores } from "models";
import { NestedPrimitiveData } from "models/experiments";
import { ExampleData } from "models/experiments/ExperimentRunData";
import { useMemo, useRef, useState } from "react";
import { PyObjectComponent } from "./pyobjects/PyObject";

const defaultColumns: TableColumn<ExampleData>[] = [
  {
    key: "id",
    dataIndex: "id",
    title: "ID",
    // width: "max-content",
    // fixed: "left",
    sorter: true,
  },
  {
    key: "name",
    dataIndex: "name",
    title: "Name",
    // width: "max-content",
    // fixed: "left",
    sorter: true,
  },
];

export const ExampleExplorer = observer(
  ({ expRun }: { expRun: ExperimentRun }) => {
    const { expRunStore } = useStores();
    const ref = useRef<HTMLDivElement>(null);
    const remainHeight = useRemainingHeight(ref, 128);
    const [selectedExampleTab, setSelectedExampleTab] = useState<
      FixedSizeMap<string, string>
    >(FixedSizeMap.withCapacity(24));

    const columns = useMemo(() => {
      let extraColumns = [];
      if (expRun.dataTracker.individual.primitive.keys.length > 0) {
        extraColumns.push(
          data2columns(
            "Data",
            ["data", "primitive"],
            expRun.data.individual.get(
              expRun.dataTracker.individual.primitive.keys[0]
            )!.data.primitive
          )
        );
      }

      return defaultColumns.concat(extraColumns);
    }, [expRun.dataTracker.individual.primitive.keys[0]]);

    return (
      <div ref={ref}>
        <TableComponent
          selectRows={false}
          rowKey="id"
          scroll={{ x: "max-content", y: remainHeight }}
          virtualTable={true}
          store={{
            query: async (limit, offset, conditions, sortedBy) => {
              await expRunStore.fetchExpRunData(
                expRun,
                {
                  aggregated: {},
                  individual: {
                    primitive: true,
                    complex: true,
                  },
                },
                limit,
                offset,
                sortedBy.length > 0 ? sortedBy[0] : undefined
              );

              let records: ExampleData[] = [];
              expRun.dataTracker
                .getIndividualPrimitiveKeys(limit, offset)
                .forEach((exampleId) => {
                  records.push(expRun.data.individual.get(exampleId)!);
                });

              return {
                records,
                total: expRun.dataTracker.individual.primitive.total,
              };
            },
          }}
          columns={columns}
          expandable={{
            rowExpandable: (record: ExampleData) =>
              Object.keys(record.data.complex).length > 0,
            expandedRowRender: (
              record: ExampleData,
              recordIndex: number,
              indent: number
            ) => {
              return (
                <Tabs
                  tabPosition="left"
                  activeKey={selectedExampleTab.get(record.id)}
                  onChange={(key) => {
                    setSelectedExampleTab(
                      selectedExampleTab.set(record.id, key)
                    );
                  }}
                  items={Object.entries(record.data.complex).map(
                    ([key, value]) => {
                      return {
                        label: (
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: indent - 24 * 2, // 24 is padding of the tab
                            }}
                          >
                            {key}
                          </span>
                        ),
                        key: key,
                        children: <PyObjectComponent object={value} />,
                      };
                    }
                  )}
                />
              );
            },
          }}
        />
      </div>
    );
  }
);

export const data2columns = (
  title: string,
  path: string[],
  data: NestedPrimitiveData
): TableColumn<ExampleData> => {
  return {
    key: path.join("."),
    title,
    children: Object.entries(data).map(([key, value]) => {
      let childpath = path.concat([key]);
      if (typeof value === "object" && value !== null) {
        return data2columns(key, childpath, value);
      }
      return {
        title: key,
        key: childpath.join("."),
        dataIndex: childpath,
        sorter: true,
        render:
          typeof value === "number"
            ? Render.number
            : typeof value === "boolean"
            ? Render.boolFmt2
            : Render.str,
      };
    }),
  };
};
