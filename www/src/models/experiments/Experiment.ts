import { action, computed, makeObservable, observable } from "mobx";
import { Record } from "gena-app";

export class PyObjectType {
  path: string;
  args: PyObjectType[];

  public constructor(path: string, args: PyObjectType[]) {
    this.path = path;
    this.args = args;

    makeObservable(this, {
      path: observable,
      args: observable,
    });
  }

  public static deserialize(record: any): PyObjectType {
    return new PyObjectType(
      record.path,
      record.args.map(PyObjectType.deserialize)
    );
  }

  public isNumber(): boolean {
    return (
      this.path === "int" ||
      this.path === "float" ||
      (this.path === "typing.Union" && this.args.every((arg) => arg.isNumber()))
    );
  }
}

export class NestedPrimitiveOutputSchema {
  schema: { [key: string]: PyObjectType | NestedPrimitiveOutputSchema };

  public constructor(schema: {
    [key: string]: PyObjectType | NestedPrimitiveOutputSchema;
  }) {
    this.schema = schema;

    makeObservable(this, {
      schema: observable,
    });
  }

  public static deserialize(record: any): NestedPrimitiveOutputSchema {
    return new NestedPrimitiveOutputSchema(
      Object.fromEntries(
        Object.entries(record.schema).map(([key, value]: [string, any]) => {
          if (value.schema !== undefined) {
            return [key, NestedPrimitiveOutputSchema.deserialize(value)];
          } else {
            return [key, PyObjectType.deserialize(value)];
          }
        })
      )
    );
  }
}

export class Experiment implements Record<number> {
  id: number;
  name: string;
  version: number;
  description: string;
  program: string;
  params: { [key: string]: PyObjectType };
  aggregatedPrimitiveOutputs: NestedPrimitiveOutputSchema;

  public constructor(
    id: number,
    name: string,
    version: number,
    description: string,
    program: string,
    params: { [key: string]: PyObjectType },
    aggregatedPrimitiveOutputs: NestedPrimitiveOutputSchema
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
