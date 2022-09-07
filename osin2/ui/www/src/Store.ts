import { action, observable, makeAutoObservable, makeObservable, flow, computed } from "mobx";
import axios from 'axios';

export class ColumnSchema {
  @observable name: string;
  @observable count: string;
  @observable visibility: boolean;
  @observable type: "auto" | "string" | "number";
  @observable format: string[];
  @observable hasChanged: boolean;

  constructor(
    name: string,
    count: string,
    visibility: boolean,
    type: "auto" | "string" | "number",
    format: string[],
  ) {
    makeObservable(this);
    this.name = name;
    this.count = count;
    this.visibility = visibility;
    this.type = type;
    this.format = format;
    this.hasChanged = false;
  }

  @action
  public setVisibility(visibility: boolean) {
    this.visibility = visibility;
    this.hasChanged = true;
  }
}

export class TableSchema {
  @observable name: string;
  @observable version: number;
  @observable columns: { [id: string]: ColumnSchema };


  constructor(name: string, version: number, columns: { [id: string]: ColumnSchema }) {
    makeObservable(this);
    this.name = name;
    this.version = version;
    this.columns = columns;
  }

  save = flow(function* (this: TableSchema) {
    yield axios.post(`/api/v1/tables/${this.name}`, { columns: this.columns });
    for (let col of Object.values(this.columns)) {
      col.hasChanged = false;
    }
  });

  @computed get hasChanged() {
    return Object.values(this.columns).some((col) => col.hasChanged);
  }
}


export class Store {
  @observable schemas: any = {};
  @observable version: number = 0.0;

  constructor() {
    makeObservable(this);
  }

  downloadSchema = flow(function* (this: Store, name: string) {
    let resp = yield axios.get(`/api/v1/tables/${name}`);
    let columns: any = {};
    for (const [name, col] of Object.entries<any>(resp.data.columns)) {
      columns[name] = new ColumnSchema(name, col.count, col.visibility, col.type, col.format);
    }
    this.setSchema(new TableSchema(
      name,
      resp.data.version,
      columns
    ));
  });

  @action
  public setSchema(schema: TableSchema) {
    this.schemas[schema.name] = schema;
  }
}

export type MobxProviderProps = { store: Store }