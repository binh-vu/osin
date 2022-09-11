import { SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { SERVER } from "../../env";
import { Experiment } from "./Experiment";

export class ExperimentStore extends SimpleCRUDStore<number, Experiment> {
  constructor() {
    super(`${SERVER}/api/exp`, undefined, false, []);
  }
}
