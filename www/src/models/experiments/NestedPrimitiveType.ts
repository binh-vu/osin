import { Attribute } from "components/reports";
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

  public getLeafAttribute(keys: string[]): PyObjectType {
    if (keys.length === 0) {
      throw new Error("keys must not empty for leaf attribute");
    }
    let schema: NestedPrimitiveDataSchema = this;
    for (let i = 0; i < keys.length - 1; i++) {
      const tmp = schema.schema[keys[i]];
      if (tmp instanceof NestedPrimitiveDataSchema) {
        schema = tmp;
      } else {
        throw new Error(
          `key ${keys.slice(0, i + 1)} is not a NestedPrimitiveDataSchema`
        );
      }
    }

    let output = schema.schema[keys[keys.length - 1]];
    if (output instanceof PyObjectType) {
      return output;
    }

    throw new Error(
      `key ${keys} is not a leaf attribute or not exist. Found: ${output}`
    );
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

  /**
   * Get path that leads to the leaf attributes of this schema tree.
   *
   * A leave attribute is the attribute has type PyObjectType, not NestedPrimitiveDataSchema.
   */
  public leafAttributes(): Attribute[] {
    let leaves: Attribute[] = [];
    for (const key in this.schema) {
      const type = this.schema[key];
      if (type instanceof NestedPrimitiveDataSchema) {
        leaves = leaves.concat(
          type.leafAttributes().map((attr) => {
            const path = attr.path.slice();
            path.splice(0, 0, key);
            return new Attribute(path);
          })
        );
      } else {
        leaves.push(new Attribute([key]));
      }
    }
    return leaves;
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

export class ParamSchema {
  type: PyObjectType;
  schema: { [key: string]: PyObjectType | ParamSchema };

  public constructor(
    type: PyObjectType,
    schema: { [key: string]: PyObjectType | ParamSchema }
  ) {
    this.type = type;
    this.schema = schema;

    makeObservable(this, {
      type: observable,
      schema: observable,
    });
  }

  public static deserialize(record: any): ParamSchema {
    return new ParamSchema(
      PyObjectType.deserialize(record.type),
      Object.fromEntries(
        Object.entries(record.schema).map(([key, value]: [string, any]) => {
          if (value.schema !== undefined) {
            return [key, ParamSchema.deserialize(value)];
          } else {
            return [key, PyObjectType.deserialize(value)];
          }
        })
      )
    );
  }

  /**
   * Get path that leads to the leaf attributes of this schema tree.
   *
   * A leave attribute is the attribute has type PyObjectType, not NestedPrimitiveDataSchema.
   */
  public leafAttributes(): Attribute[] {
    let leaves: Attribute[] = [];
    for (const key in this.schema) {
      const type = this.schema[key];
      if (type instanceof ParamSchema) {
        leaves = leaves.concat(
          type.leafAttributes().map((attr) => {
            const path = attr.path.slice();
            path.splice(0, 0, key);
            return new Attribute(path);
          })
        );
      } else {
        leaves.push(new Attribute([key]));
      }
    }
    return leaves;
  }

  public static mergeSchemas(
    schemas: ParamSchema[],
    sharedNamespace: boolean = true
  ): ParamSchema {
    const schema: { [key: string]: PyObjectType | ParamSchema } = {};

    if (sharedNamespace) {
      for (const s of schemas) {
        for (const [k, v] of Object.entries(s.schema)) {
          if (schema[k] !== undefined) {
            return ParamSchema.mergeSchemas(schemas, false);
          }
          schema[k] = v;
        }
      }
      return new ParamSchema(schemas[0].type, schema);
    }

    for (let i = 0; i < schemas.length; i++) {
      schema[i.toString()] = schemas[i];
    }
    return new ParamSchema(new PyObjectType("list", []), schema);
  }
}
