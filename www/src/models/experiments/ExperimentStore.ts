import { SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { SERVER } from "../../env";
import { Experiment, NestedPrimitiveOutputSchema } from "./Experiment";

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
    return new Experiment(
      record.id,
      record.name,
      record.version,
      record.description,
      record.program,
      record.params,
      NestedPrimitiveOutputSchema.deserialize(
        record.aggregated_primitive_outputs
      )
    );
  }
}
