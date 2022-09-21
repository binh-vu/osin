import { ProColumns } from "@ant-design/pro-table";
import filesize from "filesize";
import { InternalLink } from "gena-app";
import { observer } from "mobx-react";
import { TableComponent, Render } from "../../../components/TableComponent";
import { Experiment, ExperimentRun, useStores } from "../../../models";
import { NestedPrimitiveDataSchema } from "models";
import { routes } from "../../../routes";

const defaultColumns: ProColumns[] = [
  {
    dataIndex: "id",
    title: "Name",
    width: "max-content",
    fixed: "left",
    render: ((id: number, exprun: ExperimentRun) => {
      return (
        <InternalLink
          path={routes.run}
          urlArgs={{ expId: exprun.exp, runId: id }}
          queryArgs={{}}
        >
          Run {id}
        </InternalLink>
      );
    }) as any,
  },
  {
    dataIndex: "createdTime",
    title: "Started at",
    render: Render.datetimeFmt1 as any,
  },
  {
    dataIndex: "duration",
    title: "Duration",
    render: Render.duration as any,
    // render: ((text: any, record: ExperimentRun) => {
    //   const duration =
    //     record.finishedTime.getTime() - record.createdTime.getTime();
    //   return Render.duration(duration);
    // }) as any,
  },
  {
    dataIndex: "isFinished",
    title: <abbr title="is finished">F</abbr>,
    render: Render.boolFmt1 as any,
  },
  {
    dataIndex: "isSuccessful",
    title: <abbr title="is succesful">S</abbr>,
    render: Render.boolFmt1 as any,
  },
  {
    dataIndex: "isDeleted",
    title: <abbr title="is deleted">D</abbr>,
    render: Render.boolFmt3Reverse as any,
  },
];

export const ExperimentRunExplorer = observer(
  ({ exp }: { exp: Experiment }) => {
    const { expRunStore } = useStores();

    let columns = defaultColumns.concat([
      schema2columns(
        "Data",
        ["data", "aggregated", "primitive"],
        exp.aggregatedPrimitiveOutputs
      ),
      {
        title: "System Metrics",
        children: [
          {
            title: "CPUs",
            dataIndex: ["metadata", "n_cpus"],
            render: Render.str,
          },
          {
            title: "Memory Usage",
            dataIndex: ["metadata", "memory_usage"],
            render: ((value: number) => {
              if (isNaN(value)) {
                return value.toString();
              }
              return filesize(value, {
                base: 2,
                standard: "jedec",
              });
            }) as any,
          },
          {
            title: "Hostname",
            dataIndex: ["metadata", "hostname"],
            render: Render.str,
          },
        ],
      },
    ]);

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

export const schema2columns = (
  title: string,
  path: string[],
  schema: NestedPrimitiveDataSchema
) => {
  return {
    title,
    children: Object.entries(schema.schema).map(([key, value]): any => {
      if (value instanceof NestedPrimitiveDataSchema) {
        return schema2columns(key, path.concat([key]), value);
      }
      return {
        title: key,
        dataIndex: path.concat([key]),
        render: value.isNumber()
          ? Render.number
          : value.isBoolean()
          ? Render.boolFmt2
          : Render.str,
      };
    }),
  };
};
