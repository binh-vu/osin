import { ProColumns } from "@ant-design/pro-table";
import filesize from "filesize";
import { InternalLink } from "gena-app";
import humanizeDuration from "humanize-duration";
import { observer } from "mobx-react";
import { TableComponent } from "../../../components/TableComponent";
import { Experiment, ExperimentRun, useStores } from "../../../models";
import { NestedPrimitiveOutputSchema } from "../../../models/experiments";
import { routes } from "../../../routes";

const render2str = (text: any) => {
  return text.toString();
};
const render2number = (value: number) => {
  return value.toLocaleString(undefined, { minimumFractionDigits: 3 });
};
const dtFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
  second: "numeric",
});
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
    render: ((createdTime: Date) => {
      const [
        month,
        lit1,
        day,
        lit2,
        year,
        lit3,
        hour,
        lit4,
        minute,
        lit5,
        second,
      ] = dtFormatter.formatToParts(createdTime);
      return `${hour.value}:${minute.value}:${second.value} · ${day.value} ${month.value}, ${year.value}`;
    }) as any,
  },
  {
    dataIndex: "finishedTime",
    title: "Duration",
    render: ((text: any, record: ExperimentRun) => {
      const duration =
        record.finishedTime.getTime() - record.createdTime.getTime();
      return humanizeDuration(duration);
    }) as any,
  },
  {
    dataIndex: "isFinished",
    title: <abbr title="is finished">F</abbr>,
    render: render2str,
  },
  {
    dataIndex: "isSuccessful",
    title: <abbr title="is succesful">S</abbr>,
    render: render2str,
  },
  {
    dataIndex: "isDeleted",
    title: <abbr title="is deleted">D</abbr>,
    render: render2str,
  },
];

export const ExperimentRunExplorer = observer(
  ({ exp }: { exp: Experiment }) => {
    const { expRunStore } = useStores();

    let columns = defaultColumns.concat([
      schema2columns(
        "Metrics",
        ["aggregatedPrimitiveOutputs"],
        exp.aggregatedPrimitiveOutputs
      ),
      {
        title: "System Metrics",
        children: [
          {
            title: "CPUs",
            dataIndex: ["metadata", "n_cpus"],
            render: render2str,
          },
          {
            title: "Memory Usage",
            dataIndex: ["metadata", "memory_usage"],
            render: ((value: number) => {
              return filesize(value, {
                base: 2,
                standard: "jedec",
              });
            }) as any,
          },
          {
            title: "Hostname",
            dataIndex: ["metadata", "hostname"],
            render: render2str,
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

const schema2columns = (
  title: string,
  path: string[],
  schema: NestedPrimitiveOutputSchema
) => {
  return {
    title,
    children: Object.entries(schema.schema).map(([key, value]): any => {
      if (value instanceof NestedPrimitiveOutputSchema) {
        return schema2columns(key, path.concat([key]), value);
      }
      return {
        title: key,
        dataIndex: path.concat([key]),
        render: value.isNumber() ? render2number : render2str,
      };
    }),
  };
};
