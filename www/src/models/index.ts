import React, { createContext } from "react";
import { message } from "antd";
import { registerDefaultAxiosErrorHandler } from "gena-app";
import {
  Experiment,
  ExperimentStore,
  ExperimentRun,
  ExperimentRunStore,
} from "./experiments";
import { toJS } from "mobx";

export const stores = {
  expStore: new ExperimentStore(),
  expRunStore: new ExperimentRunStore(),
};

registerDefaultAxiosErrorHandler((error) => {
  message.error("Error while talking with the server.", 5);
});

(window as any)._stores = stores;
(window as any).toJS = toJS;
export type IStore = Readonly<typeof stores>;

/** Init the stores with essential information (e.g., loading the ui settings) needed to run the app */
export function initStores(): Promise<void> {
  return Promise.resolve();
}

export const StoreContext = createContext<IStore>(stores);

export function useStores(): IStore {
  return React.useContext(StoreContext);
}

export { Experiment, ExperimentStore, ExperimentRun, ExperimentRunStore };