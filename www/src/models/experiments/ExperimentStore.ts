import { SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { SERVER } from "env";
import { Experiment } from "./Experiment";
import { NestedPrimitiveDataSchema, PyObjectType } from "./NestedPrimitiveType";

export class ExperimentStore extends SimpleCRUDStore<number, Experiment> {
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

  public deserialize(record: any): Experiment {
    let params = Object.fromEntries(
      Object.entries(record.params).map(([key, value]: [string, any]) => {
        return [key, PyObjectType.deserialize(value)];
      })
    );

    return new Experiment(
      record.id,
      record.name,
      record.version,
      record.description,
      record.program,
      params,
      NestedPrimitiveDataSchema.deserialize(record.aggregated_primitive_outputs)
    );
  }
}
