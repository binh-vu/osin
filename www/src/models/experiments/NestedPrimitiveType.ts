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

export class NestedPrimitiveDataSchema {
  schema: { [key: string]: PyObjectType | NestedPrimitiveDataSchema };

  public constructor(schema: {
    [key: string]: PyObjectType | NestedPrimitiveDataSchema;
  }) {
    this.schema = schema;

    makeObservable(this, {
      schema: observable,
    });
  }

  public static deserialize(record: any): NestedPrimitiveDataSchema {
    return new NestedPrimitiveDataSchema(
      Object.fromEntries(
        Object.entries(record.schema).map(([key, value]: [string, any]) => {
          if (value.schema !== undefined) {
            return [key, NestedPrimitiveDataSchema.deserialize(value)];
          } else {
            return [key, PyObjectType.deserialize(value)];
          }
        })
      )
    );
  }

  public static flatten(
    nestedData: NestedPrimitiveData
  ): { key: string; value: string | number | boolean | null }[] {
    let out = [];
    for (const key in nestedData) {
      const value = nestedData[key];
      if (value !== null && typeof value === "object") {
        for (const item of NestedPrimitiveDataSchema.flatten(value)) {
          out.push({
            key: `${key}.${item.key}`,
            value: item.value,
          });
        }
      } else {
        out.push({ key, value });
      }
    }
    return out;
  }
}

export interface NestedPrimitiveData {
  [key: string]: string | number | boolean | null | NestedPrimitiveData;
}
