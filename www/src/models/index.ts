import React, { createContext } from "react";
import { message } from "antd";
import { registerDefaultAxiosErrorHandler } from "gena-app";
import {
  Experiment,
  ExperimentStore,
  ExperimentRun,
  ExperimentRunStore,
  PyObjectType,
  NestedPrimitiveDataSchema,
  NestedPrimitiveData,
} from "./experiments";
import { toJS } from "mobx";
import { ExpRunView, ExpRunViewStore } from "./views";
import { ReportStore } from "./reports/ReportStore";
import { Report } from "./reports/Report";
import { ExpReportStore } from "./reports/ExpReportStore";
import { ExpReport } from "./reports/ExpReport";
import { AxiosError } from "axios";

const expStore = new ExperimentStore();
const reportStore = new ReportStore();

export const stores = {
  expStore,
  expRunStore: new ExperimentRunStore(),
  expRunViewStore: new ExpRunViewStore(),
  reportStore,
  expReportStore: new ExpReportStore(expStore, reportStore),
};

registerDefaultAxiosErrorHandler((error) => {
  const reason = error.reason as AxiosError;
  if (
    reason.response !== undefined &&
    typeof reason.response.data === "object" &&
    typeof (reason.response.data as any).message === "string"
  ) {
    message.error((reason.response.data as any).message, 5);
  } else {
    message.error("Error while talking with the server.", 5);
  }
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

export {
  Experiment,
  ExperimentStore,
  ExperimentRun,
  ExperimentRunStore,
  ExpRunView,
  ExpRunViewStore,
  ReportStore,
  Report,
  ExpReportStore,
  ExpReport,
  PyObjectType,
  NestedPrimitiveDataSchema,
};

export type { NestedPrimitiveData };
