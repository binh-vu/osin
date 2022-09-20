import axios from "axios";
import { FetchResult, SimpleCRUDStore, SingleKeyIndex } from "gena-app";
import { action, flow, makeObservable, observable } from "mobx";
import { CancellablePromise } from "mobx/dist/api/flow";
import { SERVER } from "../../env";
import { Experiment } from "./Experiment";
import { ExperimentRun } from "./ExperimentRun";
import {
  ExampleData,
  ExperimentRunData,
  ExpRunDataTracker,
} from "./ExperimentRunData";

export class ExperimentRunStore extends SimpleCRUDStore<number, ExperimentRun> {
  public noRunsOfExperiment: { [expId: number]: number } = {};
  public timezoneOffset: number = new Date().getTimezoneOffset() * 60000;

  constructor() {
    super(
      `${SERVER}/api/exprun`,
      {
        isDeleted: "is_deleted",
        isFinished: "is_finished",
        createdTime: "created_time",
        finishedTime: "finished_time",
      },
      false,
      [new SingleKeyIndex("exp")]
    );

    makeObservable(this, {
      noRunsOfExperiment: observable,
      fetchByExp: action,
      fetchExpRunData: action,
      fetchActivity: action,
    });
  }

  get expIndex() {
    return this.indices[0] as SingleKeyIndex<number, number, ExperimentRun>;
  }

  async fetchActivity(since: Date): Promise<{ date: string; count: number }[]> {
    let resp: any;
    try {
      resp = await axios.get(`${this.remoteURL}/activity`, {
        params: {
          since: since.getTime(),
        },
      });
    } catch (e) {
      throw e;
    }
    return resp.data;
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

  fetchExpRunData: (
    exp: ExperimentRun,
    fields: {
      aggregated: { primitive?: boolean; complex?: boolean };
      individual: { primitive?: boolean; complex?: boolean };
    },
    limit: number,
    offset: number,
    sortedBy?: string,
    sortedOrder?: "asc" | "desc"
  ) => CancellablePromise<void> = flow(function* (
    this: ExperimentRunStore,
    exp: ExperimentRun,
    fields: {
      aggregated: { primitive?: boolean; complex?: boolean };
      individual: { primitive?: boolean; complex?: boolean };
    },
    limit: number,
    offset: number,
    sortedBy?: string,
    sortedOrder?: "asc" | "desc"
  ) {
    let _fields = [];
    if (fields.aggregated.primitive) {
      _fields.push("aggregated.primitive");
    }
    if (fields.aggregated.complex) {
      _fields.push("aggregated.complex");
    }
    if (fields.individual.primitive) {
      _fields.push("individual.primitive");
    }
    if (fields.individual.complex) {
      _fields.push("individual.complex");
    }

    let resp: any;
    try {
      this.state.value = "updating";
      resp = yield axios.get(`${this.remoteURL}/${exp.id}/data`, {
        params: {
          fields: _fields.join(","),
          limit,
          offset,
          sorted_by:
            sortedBy !== undefined
              ? sortedOrder === "desc"
                ? "-" + sortedBy
                : sortedBy
              : undefined,
        },
      });
    } catch (error: any) {
      this.state.value = "error";
      throw error;
    }

    if (fields.aggregated.primitive) {
      exp.dataTracker.aggregated.primitive = true;
      exp.data.aggregated.primitive = resp.data.aggregated.primitive;
    }
    if (fields.aggregated.complex) {
      exp.dataTracker.aggregated.complex = true;
      exp.data.aggregated.complex = resp.data.aggregated.complex;
    }
    if (fields.individual.primitive) {
      let start = offset;
      let end = offset + limit;

      exp.dataTracker.individual.primitive.total = resp.data.n_examples;
      for (const example of resp.data.individual) {
        if (exp.data.individual.has(example.id)) {
          exp.data.individual.get(example.id)!.data.primitive =
            example.data.primitive;
        } else {
          exp.data.individual.set(example.id, example);
        }
      }

      if (
        sortedBy === exp.dataTracker.individual.primitive.sortedBy &&
        sortedOrder === exp.dataTracker.individual.primitive.sortedOrder
      ) {
        // sharing the same sortedBy and sortedOrder
        // we can check if we can extend the range
        if (start >= exp.dataTracker.individual.primitive.start) {
          if (start <= exp.dataTracker.individual.primitive.end) {
            // overlapping
            exp.dataTracker.individual.primitive.keys =
              exp.dataTracker.individual.primitive.keys.concat(
                resp.data.individual
                  .slice(exp.dataTracker.individual.primitive.end - start)
                  .map((example: ExampleData) => example.id)
              );
            exp.dataTracker.individual.primitive.end = end;
          } else {
            // non-overlapping
            exp.dataTracker.individual.primitive.start = start;
            exp.dataTracker.individual.primitive.end = end;
            exp.dataTracker.individual.primitive.keys =
              resp.data.individual.map((example: ExampleData) => example.id);
          }
        } else {
          if (exp.dataTracker.individual.primitive.start <= end) {
            // overlapping
            exp.dataTracker.individual.primitive.keys = resp.data.individual
              .slice(0, end - exp.dataTracker.individual.primitive.start)
              .map((example: ExampleData) => example.id)
              .concat(exp.dataTracker.individual.primitive.keys);
            exp.dataTracker.individual.primitive.start = start;
            exp.dataTracker.individual.primitive.end = Math.max(
              exp.dataTracker.individual.primitive.end,
              end
            );
          } else {
            // non-overlapping
            exp.dataTracker.individual.primitive.start = start;
            exp.dataTracker.individual.primitive.end = end;
            exp.dataTracker.individual.primitive.keys =
              resp.data.individual.map((example: ExampleData) => example.id);
          }
        }
      } else {
        // not sharing the same sortedBy and sortedOrder
        // we can't extend the range, and have to reset it
        exp.dataTracker.individual.primitive.start = start;
        exp.dataTracker.individual.primitive.end = end;
        exp.dataTracker.individual.primitive.sortedBy = sortedBy;
        exp.dataTracker.individual.primitive.sortedOrder = sortedOrder;
        exp.dataTracker.individual.primitive.keys = resp.data.individual.map(
          (example: ExampleData) => example.id
        );
      }
    }
    if (fields.individual.complex) {
      let start = offset;
      let end = offset + limit;

      exp.dataTracker.individual.complex.total = resp.data.n_examples;
      for (const example of resp.data.individual) {
        if (exp.data.individual.has(example.id)) {
          exp.data.individual.get(example.id)!.data.complex =
            example.data.complex;
        } else {
          exp.data.individual.set(example.id, example);
        }
      }

      if (
        sortedBy === exp.dataTracker.individual.complex.sortedBy &&
        sortedOrder === exp.dataTracker.individual.complex.sortedOrder
      ) {
        // sharing the same sortedBy and sortedOrder
        // we can check if we can extend the range
        if (start >= exp.dataTracker.individual.complex.start) {
          if (start <= exp.dataTracker.individual.complex.end) {
            // overlapping
            exp.dataTracker.individual.complex.keys =
              exp.dataTracker.individual.complex.keys.concat(
                resp.data.individual
                  .slice(exp.dataTracker.individual.complex.end - start)
                  .map((example: ExampleData) => example.id)
              );
            exp.dataTracker.individual.complex.end = end;
          } else {
            // non-overlapping
            exp.dataTracker.individual.complex.start = start;
            exp.dataTracker.individual.complex.end = end;
            exp.dataTracker.individual.complex.keys = resp.data.individual.map(
              (example: ExampleData) => example.id
            );
          }
        } else {
          if (exp.dataTracker.individual.complex.start <= end) {
            // overlapping
            exp.dataTracker.individual.complex.keys = resp.data.individual
              .slice(0, end - exp.dataTracker.individual.complex.start)
              .map((example: ExampleData) => example.id)
              .concat(exp.dataTracker.individual.complex.keys);
            exp.dataTracker.individual.complex.start = start;
            exp.dataTracker.individual.complex.end = Math.max(
              exp.dataTracker.individual.complex.end,
              end
            );
          } else {
            // non-overlapping
            exp.dataTracker.individual.complex.start = start;
            exp.dataTracker.individual.complex.end = end;
            exp.dataTracker.individual.complex.keys = resp.data.individual.map(
              (example: ExampleData) => example.id
            );
          }
        }
      } else {
        // not sharing the same sortedBy and sortedOrder
        // we can't extend the range, and have to reset it
        exp.dataTracker.individual.complex.start = start;
        exp.dataTracker.individual.complex.end = end;
        exp.dataTracker.individual.complex.sortedBy = sortedBy;
        exp.dataTracker.individual.complex.sortedOrder = sortedOrder;
        exp.dataTracker.individual.complex.keys = resp.data.individual.map(
          (example: ExampleData) => example.id
        );
      }
    }

    this.state.value = "updated";
  });

  public deserialize(record: any): ExperimentRun {
    let data = new ExperimentRunData({ primitive: {}, complex: {} }, new Map());
    let dataTracker = new ExpRunDataTracker(
      { primitive: false, complex: false },
      {
        primitive: {},
        complex: {},
      }
    );
    if (record.aggregated_primitive_outputs !== undefined) {
      data.aggregated.primitive = record.aggregated_primitive_outputs;
      dataTracker.aggregated.primitive = true;
    }

    return new ExperimentRun(
      record.id,
      record.exp,
      record.is_deleted,
      record.is_finished,
      record.is_successful,
      new Date(record.created_time - this.timezoneOffset),
      new Date(record.finished_time - this.timezoneOffset),
      record.params,
      record.metadata,
      data,
      dataTracker
    );
  }
}
