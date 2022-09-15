import { Avatar, Button, Col, List, Row, Typography } from "antd";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { InternalLink } from "gena-app";
import { useStores } from "../../models";
import { routes } from "../../routes";

import {
  red,
  volcano,
  orange,
  gold,
  yellow,
  lime,
  green,
  cyan,
  blue,
  geekblue,
  purple,
  magenta,
} from "@ant-design/colors";
import { ExperimentExplorer } from "../exp/ExperimentExplorer";

// const colorWheels = ["#f56a00", "#7265e6", "#1890ff", "#00a2ae"];
const colorWheels = [
  red[5],
  volcano[5],
  blue[5],
  gold[5],
  orange[5],
  yellow[5],
  lime[5],
  green[5],
  cyan[5],
  geekblue[5],
  purple[5],
  magenta[5],
];

export const HomePage = observer(() => {
  return <ExperimentExplorer />;
});
