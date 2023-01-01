import { FetchResult, SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { SERVER } from "env";
import { Experiment } from "./Experiment";
import {
  NestedPrimitiveDataSchema,
  ParamSchema,
  PyObjectType,
} from "./NestedPrimitiveType";

export class ExperimentStore extends SimpleCRUDStore<number, Experiment> {
  protected hasFetchedAll = false;

  constructor() {
    super(
      `${SERVER}/api/exp`,
      {
        aggregatedPrimitiveOutputs: "aggregated_primitive_outputs",
      },
      false,
      []
    );
  }

  /** Fetch all experiments from the server */
  async fetchAllExperiments(): Promise<void> {
    if (!this.hasFetchedAll || this.refetch) {
      return this.fetch({ limit: 10000, offset: 0 }).then(() => {
        this.hasFetchedAll = true;
        return;
      });
    }
    return Promise.resolve();
  }

  groupExperimentsByName() {
    const groupedExps: { [name: string]: Experiment[] } = {};
    for (const exp of this.records.values()) {
      if (exp === null) continue;
      if (groupedExps[exp.name] === undefined) {
        groupedExps[exp.name] = [];
      }
      groupedExps[exp.name].push(exp);
    }
    for (const name in groupedExps) {
      groupedExps[name].sort((a, b) => b.version - a.version);
    }
    return groupedExps;
  }

  public deserialize(record: any): Experiment {
    return new Experiment(
      record.id,
      record.name,
      record.version,
      record.description,
      record.program,
      Object.fromEntries(
        Object.entries(record.params).map(([ns, p]) => [
          ns,
          ParamSchema.deserialize(p),
        ])
      ),
      NestedPrimitiveDataSchema.deserialize(record.aggregated_primitive_outputs)
    );
  }
}
