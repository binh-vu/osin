import { Record } from "gena-app";
import { makeObservable, observable } from "mobx";
import { NestedPrimitiveDataSchema, ParamSchema } from "./NestedPrimitiveType";

export class Experiment implements Record<number> {
  id: number;
  name: string;
  version: number;
  description: string;
  program: string;
  params: ParamSchema[];
  aggregatedPrimitiveOutputs: NestedPrimitiveDataSchema;

  public constructor(
    id: number,
    name: string,
    version: number,
    description: string,
    program: string,
    params: ParamSchema[],
    aggregatedPrimitiveOutputs: NestedPrimitiveDataSchema
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;
    this.program = program;
    this.params = params;
    this.aggregatedPrimitiveOutputs = aggregatedPrimitiveOutputs;

    makeObservable(this, {
      id: observable,
      name: observable,
      version: observable,
      description: observable,
      program: observable,
      params: observable,
      aggregatedPrimitiveOutputs: observable,
    });
  }
}
