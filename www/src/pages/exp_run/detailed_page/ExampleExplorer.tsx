import { ProColumns } from "@ant-design/pro-table";
import { Tabs } from "antd";
import { Render, TableComponent } from "components/TableComponent";
import { observer } from "mobx-react";
import { ExperimentRun, useStores } from "models";
import {
  ExampleData,
  NestedPrimitiveData,
} from "models/experiments/ExperimentRunData";
import { PyObjectComponent } from "./pyobjects/PyObject";

const defaultColumns: ProColumns[] = [
  {
    dataIndex: "id",
    title: "Example",
    width: "max-content",
    fixed: "left",
  },
  {
    dataIndex: "name",
    title: "Name",
    width: "max-content",
    fixed: "left",
  },
];

export const ExampleExplorer = observer(
  ({ expRun }: { expRun: ExperimentRun }) => {
    const { expRunStore } = useStores();

    let extraColumns = [];

    if (expRun.dataTracker.individual.primitive.keys.length > 0) {
      extraColumns.push(
        data2columns(
          "Metrics",
          ["data", "primitive"],
          expRun.data.individual.get(
            expRun.dataTracker.individual.primitive.keys[0]
          )!.data.primitive
        )
      );
    }

    let columns = defaultColumns.concat(extraColumns);

    return (
      <TableComponent
        selectRows={false}
        scroll={{ x: "max-content" }}
        query={async (limit, offset) => {
          // expRun.dataTracker.individual
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
            offset
          );

          let records: ExampleData[] = [];
          expRun.dataTracker.individual.primitive.keys.forEach((exampleId) => {
            records.push(expRun.data.individual.get(exampleId)!);
          });

          return {
            records,
            total: expRun.dataTracker.individual.primitive.total,
          };
        }}
        columns={columns}
        expandable={{
          rowExpandable: (record: ExampleData) =>
            Object.keys(record.data.complex).length > 0,
          expandedRowRender: (record: ExampleData) => {
            return (
              <Tabs
                tabPosition="left"
                items={Object.entries(record.data.complex).map(
                  ([key, value]) => {
                    return {
                      label: key,
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
    );
  }
);

export const data2columns = (
  title: string,
  path: string[],
  data: NestedPrimitiveData
) => {
  return {
    title,
    children: Object.entries(data).map(([key, value]): any => {
      if (typeof value === "object" && value !== null) {
        return data2columns(key, path.concat([key]), value);
      }
      return {
        title: key,
        dataIndex: path.concat([key]),
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
