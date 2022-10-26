import { SERVER } from "env";
import { SimpleCRUDStore, SingleKeyUniqueIndex } from "gena-app";
import { action, flow, makeObservable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { Experiment } from "models/experiments";
import { ExpRunView } from "./ExpRunView";

export class ExpRunViewStore extends SimpleCRUDStore<number, ExpRunView> {
  public noRunsOfExperiment: { [expId: number]: number } = {};
  public timezoneOffset: number = new Date().getTimezoneOffset() * 60000;

  constructor() {
    super(`${SERVER}/api/exprunview`, {}, false, [
      new SingleKeyUniqueIndex("exp"),
    ]);

    makeObservable(this, {
      fetchByExp: action,
    });
  }

  get expIndex() {
    return this.indices[0] as SingleKeyUniqueIndex<number, number, ExpRunView>;
  }

  fetchByExp: (exp: Experiment) => CancellablePromise<ExpRunView | undefined> =
    flow(function* (this: ExpRunViewStore, exp: Experiment) {
      if (this.expIndex.index.has(exp.id)) {
        return this.get(this.expIndex.index.get(exp.id)!);
      }

      return yield this.fetchOne({
        conditions: { exp: exp.id },
      });
    });

  public deserialize(record: any): ExpRunView {
    return new ExpRunView(record.id, record.exp, record.config);
  }
}
