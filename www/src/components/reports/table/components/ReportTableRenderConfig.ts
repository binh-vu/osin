import { makeObservable, observable } from "mobx";
import { makePersistable } from "mobx-persist-store";

export type HighlightMode =
  | "none"
  | "row"
  | "col"
  | "row-best"
  | "col-best"
  | { type: "row"; value: number }
  | { type: "col"; value: number };
export type ZValueStyle = "column" | "row" | "embedded";
export class ReportTableRenderConfig {
  zvalueStyle: ZValueStyle;
  highlight: HighlightMode;

  public constructor(zvalueStyle: ZValueStyle, highlight: HighlightMode) {
    this.zvalueStyle = zvalueStyle;
    this.highlight = highlight;

    makeObservable(this, {
      zvalueStyle: observable,
      highlight: observable,
    });
  }

  toObject() {
    return {
      zvalueStyle: this.zvalueStyle,
      highlight: this.highlight,
    };
  }

  static fromObject(obj: any) {
    return new ReportTableRenderConfig(obj.zvalueStyle, obj.highlight);
  }
}

export class ReportTableRenderConfigStore {
  configs: Map<string, ReportTableRenderConfig> = new Map();

  constructor() {
    makeObservable(this, {
      configs: observable,
    });
    makePersistable(this, {
      name: "ReportTableRenderConfigStore",
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
              output.set(key, ReportTableRenderConfig.fromObject(value));
            }
            return output;
          },
        },
      ],
      storage: window.localStorage,
    });
  }
}
