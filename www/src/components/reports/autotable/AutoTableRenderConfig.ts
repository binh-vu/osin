import { makeObservable, observable } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { HighlightMode } from "../basetable";

export class AutoTableRenderConfig {
  highlight: HighlightMode;

  public constructor(highlight: HighlightMode) {
    this.highlight = highlight;

    makeObservable(this, {
      highlight: observable,
    });
  }

  toObject() {
    return {
      highlight: this.highlight,
    };
  }

  static fromObject(obj: any) {
    return new AutoTableRenderConfig(obj.highlight);
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
