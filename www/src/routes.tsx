import {
  PathDef,
  NoArgsPathDef,
  NoQueryArgsPathDef,
  applyLayout,
} from "gena-app";
import { HomePage, SettingPage } from "./pages";

import React from "react";
import { SideNavBar } from "./components/Navbar";
import { Space, Layout as AntdLayou, Row, Col } from "antd";
import logo from "./logo.svg";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTableList,
  faChartLine,
  faFlask,
} from "@fortawesome/free-solid-svg-icons";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { ExperimentRunPage } from "./pages/experiment_run/ExperimentRunPage";

/*************************************************************************************
 * Layouts of the application
 */
export const Layout = (
  component: React.FunctionComponent<any> | React.ComponentClass<any, any>
) => {
  return (props: any) => {
    const element = React.createElement(component, props);
    return (
      <Row style={{ minHeight: "100vh" }}>
        <Col flex="75px">
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
              runs: 1,
            }}
            isFirstItemLogo={true}
          />
        </Col>
        <Col
          flex="auto"
          style={{ marginLeft: 8, marginRight: 8, marginTop: 16 }}
        >
          {element}
        </Col>
      </Row>
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
    component: None,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/report",
    exact: true,
  }),
  runs: new NoQueryArgsPathDef({
    component: ExperimentRunPage,
    urlSchema: { expId: "number" },
    pathDef: "/exps/:expId/runs",
    exact: true,
  }),
  home: new NoArgsPathDef({ component: HomePage, pathDef: "/", exact: true }),
};
(window as any)._routes = routes;

// apply this layout to all routes except table
applyLayout(routes, Layout, []);
