import { makeObservable, observable } from "mobx";

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

  public isBoolean(): boolean {
    return this.path === "bool";
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

export class NestedPrimitiveOutput {
  value: {
    [key: string]: string | number | boolean | null | NestedPrimitiveOutput;
  };

  public constructor(value: {
    [key: string]: string | number | boolean | null | NestedPrimitiveOutput;
  }) {
    this.value = value;

    makeObservable(this, {
      value: observable,
    });
  }

  public static deserialize(record: any): NestedPrimitiveOutput {
    for (const key in record) {
      const value = record[key];
      if (typeof value === "object") {
        record[key] = NestedPrimitiveOutput.deserialize(value);
      }
    }
    return new NestedPrimitiveOutput(record);
  }
}
