import { ProColumns } from "@ant-design/pro-table";
import { Tabs } from "antd";
import { Render, TableComponent } from "components/TableComponent";
import { observer } from "mobx-react";
import { ExperimentRun, useStores } from "models";
import { NestedPrimitiveData } from "models/experiments";
import { ExampleData } from "models/experiments/ExperimentRunData";
import { PyObjectComponent } from "./pyobjects/PyObject";
import { toJS } from "mobx";

const defaultColumns: ProColumns[] = [
  {
    dataIndex: "id",
    title: "Example",
    width: "max-content",
    fixed: "left",
    sorter: true,
  },
  {
    dataIndex: "name",
    title: "Name",
    width: "max-content",
    fixed: "left",
    sorter: true,
  },
];

export const ExampleExplorer = observer(
  ({ expRun }: { expRun: ExperimentRun }) => {
    const { expRunStore } = useStores();

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

    let columns = defaultColumns.concat(extraColumns);

    return (
      <TableComponent
        selectRows={false}
        scroll={{ x: "max-content" }}
        query={async (limit, offset, sort) => {
          const sortEntries = Object.entries(sort).filter(
            (entries) => entries[1] !== null
          );
          let sortedBy = undefined;
          let sortedOrder: "desc" | "asc" | undefined = undefined;

          if (sortEntries.length > 0) {
            sortedBy = sortEntries[0][0]
              .replaceAll(",", ".")
              .replace("data.", "");
            sortedOrder = sortEntries[0][1] === "descend" ? "desc" : "asc";
          }

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
            sortedBy,
            sortedOrder
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
