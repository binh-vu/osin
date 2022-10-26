import { EmptyToken, Render, TableComponent } from "components/table";
import { TableColumn } from "components/table/Columns";
import filesize from "filesize";
import { InternalLink } from "gena-app";
import { observer } from "mobx-react";
import {
  Experiment,
  ExperimentRun,
  ExpRunView,
  NestedPrimitiveDataSchema,
  PyObjectType,
  useStores,
} from "models";
import { routes } from "routes";

const defaultColumns: TableColumn<ExperimentRun>[] = [
  {
    key: "id",
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
    sorter: true,
    defaultSortOrder: "descend",
  },
  {
    key: "createdTime",
    dataIndex: "createdTime",
    title: "Started at",
    render: Render.datetimeFmt1 as any,
  },
  {
    key: "duration",
    dataIndex: "duration",
    title: "Duration",
    render: Render.duration as any,
  },
  {
    key: "isFinished",
    dataIndex: "isFinished",
    title: <abbr title="Is finished">F</abbr>,
    render: Render.boolFmt1 as any,
    filters: [
      { text: "Running", value: false },
      {
        text: "Finished",
        value: true,
      },
    ],
  },
  {
    key: "isSuccessful",
    dataIndex: "isSuccessful",
    title: <abbr title="Is succesful">S</abbr>,
    render: Render.boolFmt1 as any,
    filters: [
      { text: "Failed", value: false },
      {
        text: "Succeeded",
        value: true,
      },
    ],
  },
  {
    key: "isDeleted",
    dataIndex: "isDeleted",
    title: <abbr title="Is deleted">D</abbr>,
    render: Render.boolFmt3Reverse as any,
    filters: [
      {
        text: "Not deleted",
        value: false,
      },
      { text: "Deleted", value: true },
    ],
    defaultFilteredValue: [false],
  },
];

export const ExperimentRunExplorer = observer(
  ({ exp }: { exp: Experiment }) => {
    const { expRunStore, expRunViewStore } = useStores();

    let columns = defaultColumns.concat([
      schema2columns("Parameters", ["params"], exp.params),
      schema2columns(
        "Data",
        ["data", "aggregated", "primitive"],
        exp.aggregatedPrimitiveOutputs
      ),
      {
        key: "metadata",
        title: "System Metrics",
        children: [
          {
            key: "metadata.n_cpus",
            title: "CPUs",
            dataIndex: ["metadata", "n_cpus"],
            render: Render.str,
          },
          {
            key: "metadata.memory_usage",
            title: "Memory Usage",
            dataIndex: ["metadata", "memory_usage"],
            render: ((value: number | null) => {
              if (value === null) {
                return EmptyToken;
              }
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
            key: "metadata.hostname",
            title: "Hostname",
            dataIndex: ["metadata", "hostname"],
            render: Render.str,
          },
        ],
      },
    ]);
    return (
      <div>
        <TableComponent
          selectRows={true}
          rowKey="id"
          infiniteScroll={true}
          toolbar={{
            filter: true,
            filterArgs: {
              value: "isDeleted=false",
            },
          }}
          defaultPageSize={15}
          scroll={{ x: "max-content" }}
          store={{
            query: async (limit, offset, conditions, sortedBy) => {
              let res = await expRunStore.fetchByExp(
                exp,
                offset,
                limit,
                conditions,
                sortedBy
              );
              return res;
            },
            remove: async (records) => {
              await Promise.all(
                records.map((r) => {
                  r.isDeleted = true;
                  expRunStore.update(r);
                })
              );
            },
            restore: async (records) => {
              await Promise.all(
                records.map((r) => {
                  r.isDeleted = false;
                  expRunStore.update(r);
                })
              );
            },
            isDeleted: (record) => record.isDeleted,
          }}
          restoreColumnState={async () => {
            let res = await expRunViewStore.fetchByExp(exp);
            return res === undefined ? [] : res.config.columns;
          }}
          saveColumnState={async (columns) => {
            let res = await expRunViewStore.fetchByExp(exp);
            if (res === undefined) {
              await expRunViewStore.create(
                new ExpRunView(-1, exp.id, { columns })
              );
            } else {
              res.config.columns = columns;
              expRunViewStore.update(res);
            }
          }}
          columns={columns}
        />
      </div>
    );
  }
);

export const schema2columns = (
  title: string,
  path: string[],
  schema: NestedPrimitiveDataSchema | { [key: string]: PyObjectType }
): TableColumn<ExperimentRun> => {
  let childit;
  if (schema instanceof NestedPrimitiveDataSchema) {
    childit = Object.entries(schema.schema);
  } else {
    childit = Object.entries(schema);
  }

  return {
    key: path.join("."),
    title,
    dataIndex: path,
    children: childit.map(([key, value]): any => {
      let childpath = path.concat([key]);
      if (value instanceof NestedPrimitiveDataSchema) {
        return schema2columns(key, childpath, value);
      }
      return {
        title: key,
        key: childpath.join("."),
        dataIndex: childpath,
        render: value.isNumber()
          ? Render.number
          : value.isBoolean()
          ? Render.boolFmt2
          : Render.str,
      };
    }),
  };
};
