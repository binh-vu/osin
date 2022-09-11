import { action, computed, makeObservable, observable } from "mobx";
import { Record } from "gena-app";

export class Experiment implements Record<number> {
  id: number;
  name: string;
  version: number;
  description: string;

  public constructor(
    id: number,
    name: string,
    version: number,
    description: string
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;

    makeObservable(this, {
      id: observable,
      name: observable,
      version: observable,
      description: observable,
    });
  }
}
