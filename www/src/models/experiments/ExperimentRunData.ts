import { makeObservable, observable } from "mobx";
import { NestedPrimitiveData } from "./NestedPrimitiveType";

export interface PyOTable {
  type: "table";
  columns: string[];
  rows: NestedPrimitiveData[];
}

export type PyObject = PyOTable;

export class ExperimentRunData {
  public aggregated: ExpDataRecord;
  public individual: Map<string, ExampleData>;

  public constructor(
    aggregated: ExpDataRecord,
    individual: Map<string, ExampleData>
  ) {
    this.aggregated = aggregated;
    this.individual = individual;

    makeObservable(this, {
      aggregated: observable,
      individual: observable,
    });
  }
}

export interface ExampleData {
  id: string;
  name: string;
  data: ExpDataRecord;
}

export interface ExpDataRecord {
  primitive: NestedPrimitiveData;
  complex: { [key: string]: PyObject };
}

export class ExpRunDataTracker {
  public aggregated: { primitive: boolean; complex: boolean };
  public individual: {
    primitive: {
      start: number;
      end: number;
      total: number;
      sortedBy?: string;
      sortedOrder?: "asc" | "desc";
      keys: string[];
    };
    complex: {
      start: number;
      end: number;
      total: number;
      sortedBy?: string;
      sortedOrder?: "asc" | "desc";
      keys: string[];
    };
  };

  public constructor(
    aggregated: { primitive?: boolean; complex?: boolean },
    individual: {
      primitive: {
        start?: number;
        end?: number;
        total?: number;
        sortedBy?: string;
        sortedOrder?: "asc" | "desc";
      };
      complex: {
        start?: number;
        end?: number;
        total?: number;
        sortedBy?: string;
        sortedOrder?: "asc" | "desc";
      };
    }
  ) {
    this.aggregated = {
      primitive: aggregated.primitive || false,
      complex: aggregated.complex || false,
    };
    this.individual = {
      primitive: {
        start: individual.primitive.start || 0,
        end: individual.primitive.end || 0,
        total: individual.primitive.total || 0,
        sortedBy: individual.primitive.sortedBy,
        sortedOrder: individual.primitive.sortedOrder,
        keys: [],
      },
      complex: {
        start: individual.complex.start || 0,
        end: individual.complex.end || 0,
        total: individual.complex.total || 0,
        sortedBy: individual.complex.sortedBy,
        sortedOrder: individual.complex.sortedOrder,
        keys: [],
      },
    };

    makeObservable(this, {
      aggregated: observable,
      individual: observable,
    });
  }
}
