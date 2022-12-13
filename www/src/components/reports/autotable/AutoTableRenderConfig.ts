import { action, computed, makeObservable, observable } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { HighlightMode } from "../basetable";

export class AutoTableRenderConfig {
  highlight: HighlightMode;
  sorts: { column: number; order: "asc" | "desc" }[];

  public constructor(
    highlight: HighlightMode,
    sortedBy: { column: number; order: "asc" | "desc" }[]
  ) {
    this.highlight = highlight;
    this.sorts = sortedBy;

    makeObservable(this, {
      highlight: observable,
      sorts: observable,
      toggleSortColumn: action,
      sortKey: computed,
    });
  }

  get sortKey() {
    return this.sorts.map((sort) => `${sort.column}:${sort.order}`).join(",");
  }

  getSortedOrder(column: number) {
    for (const sort of this.sorts) {
      if (sort.column === column) {
        return sort.order;
      }
    }
    return undefined;
  }

  toggleSortColumn(column: number) {
    for (const sort of this.sorts) {
      if (sort.column === column) {
        if (sort.order === "desc") {
          sort.order = "asc";
        } else {
          this.sorts = this.sorts.filter((sort) => sort.column !== column);
        }
        return;
      }
    }
    this.sorts.push({ column, order: "desc" });
  }

  toObject() {
    return {
      highlight: this.highlight,
      sorts: this.sorts,
    };
  }

  static fromObject(obj: any) {
    return new AutoTableRenderConfig(obj.highlight, obj.sorts || []);
  }
}

export class AutoTableRenderConfigStore {
  configs: Map<string, AutoTableRenderConfig> = new Map();

  constructor() {
    makeObservable(this, {
      configs: observable,
    });
    makePersistable(this, {
      name: "AutoTableRenderConfigStore",
      properties: [
        {
          key: "configs",
          serialize: (configs) => {
            let output = [];
            for (const [key, value] of configs.entries()) {
              output.push([key, value.toObject()]);
            }
            return JSON.stringify(output);
          },
          deserialize: (serconfigs) => {
            let output = new Map();
            for (const [key, value] of JSON.parse(serconfigs)) {
              output.set(key, AutoTableRenderConfig.fromObject(value));
            }
            return output;
          },
        },
      ],
      storage: window.localStorage,
    });
  }
}
