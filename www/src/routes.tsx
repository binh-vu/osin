import { applyLayout, NoArgsPathDef, NoQueryArgsPathDef } from "gena-app";
import { HomePage } from "pages";

import React from "react";
import { SideNavBar } from "components/Navbar";
import logo from "./logo.svg";

import {
  faChartLine,
  faFlask,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ExpRunPage } from "pages/exp_run/detailed_page/ExpRunPage";
import { ExpRunExplorerPage } from "pages/exp_run/explorer_page/ExpRunExplorerPage";
import { ReportPage } from "pages/reports/ReportPage";
import { UpsertReportPage } from "pages/reports/UpsertReportPage";

/*************************************************************************************
 * Layouts of the application
 */
export const Layout = (
  component: React.FunctionComponent<any> | React.ComponentClass<any, any>
) => {
  return (props: any) => {
    const element = React.createElement(component, props);
    return (
      <div
        style={{
          maxHeight: "100vh",
          display: "flex",
          flexFlow: "row nowrap",
        }}
      >
        <div style={{ width: 75 }}>
          <SideNavBar
            menus={{
              home: {
                icon: <img src={logo} className="logo" alt="logo" />,
                label: "",
                title: "Home",
              },
              expSetup: {
                icon: <FontAwesomeIcon icon={faFlask} />,
                label: "Experiment",
                title: "Experiment Setup",
              },
              reports: {
                icon: <FontAwesomeIcon icon={faChartLine} />,
                label: "Reports",
                title: "Show Experiment Reports",
              },
              runs: {
                icon: <FontAwesomeIcon icon={faTableList} />,
                label: "Runs",
                title: "Show Experiment Runs",
              },
            }}
            routes={routes}
            route2schemaId={{
              home: 0,
              expSetup: 1,
              reports: 1,
              newreport: 1,
              updatereport: 1,
              runs: 1,
              run: 1,
            }}
            isFirstItemLogo={true}
          />
        </div>
        <div
          style={{
            width: "calc(100% - 75px)",
            marginTop: 16,
            overflowY: "auto",
          }}
        >
          {element}
        </div>
      </div>
    );
  };
};

const None = () => <h1>Not supposed to see this page</h1>;

/*************************************************************************************
 * Definitions for routes in this application
 */
export const routes = {
  expSetup: new NoQueryArgsPathDef({
    component: None,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/config",
    exact: true,
  }),
  reports: new NoQueryArgsPathDef({
    component: ReportPage,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/reports",
    exact: true,
  }),
  newreport: new NoQueryArgsPathDef({
    component: UpsertReportPage,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/new-report",
    exact: true,
  }),
  updatereport: new NoQueryArgsPathDef({
    component: UpsertReportPage,
    urlSchema: { reportId: "number", expId: "number" },
    pathDef: "/exps/:expId/update-report/:reportId",
    exact: true,
  }),
  runs: new NoQueryArgsPathDef({
    component: ExpRunExplorerPage,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/runs",
    exact: true,
  }),
  run: new NoQueryArgsPathDef({
    component: ExpRunPage,
    urlSchema: { expId: "number", runId: "number" },
    pathDef: "/exps/:expId/runs/:runId",
    exact: true,
  }),
  home: new NoArgsPathDef({ component: HomePage, pathDef: "/", exact: true }),
};
(window as any)._routes = routes;

// apply this layout to all routes except table
applyLayout(routes, Layout, []);
