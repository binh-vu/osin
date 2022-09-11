import { FetchResult, SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { action, flow, makeObservable, observable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { SERVER } from "../../env";
import { Experiment } from "./Experiment";
import { ExperimentRun } from "./ExperimentRun";

export class ExperimentRunStore extends SimpleCRUDStore<number, ExperimentRun> {
  public noRunsOfExperiment: { [expId: number]: number } = {};

  constructor() {
    super(`${SERVER}/api/exprun`, undefined, false, [
      new SingleKeyIndex("exp"),
    ]);

    makeObservable(this, {
      noRunsOfExperiment: observable,
      fetchByExp: action,
    });
  }

  get expIndex() {
    return this.indices[0] as SingleKeyIndex<number, number, ExperimentRun>;
  }

  fetchByExp: (
    exp: Experiment,
    start: number,
    no: number
  ) => CancellablePromise<FetchResult<ExperimentRun>> = flow(function* (
    this: ExperimentRunStore,
    exp: Experiment,
    start: number,
    no: number
  ) {
    const index = this.expIndex.index.get(exp.id);
    if (index === undefined || index.size < start + no) {
      const result: FetchResult<ExperimentRun> = yield this.fetch({
        limit: no,
        offset: start,
        conditions: { exp: exp.id },
      });
      this.noRunsOfExperiment[exp.id] = result.total;
      return result;
    }

    const output = [];

    // cause items are in insertion order.
    const it = index[Symbol.iterator]();
    for (let i = 0; i < start; i++) {
      it.next();
    }
    for (let i = 0; i < no; i++) {
      const item = it.next();
      if (item.done === true) {
        break;
      }
      const runId = item.value;
      output.push(this.records.get(runId)!);
    }

    return {
      records: output,
      total: this.noRunsOfExperiment[exp.id],
    };
  });
}