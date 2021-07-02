import React from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  useParams
} from "react-router-dom";
import ExpTable from "./ExpTable";
interface Props {

}

export default function App(props: Props) {
  return <div>
    <Router>
      <div>
        <Switch>
          <Route path="/exps/:tableName">
            <ExpTable />
          </Route>
          <Route path="/">
            <span style={{ fontSize: "2em" }}>The server is live</span>
          </Route>
        </Switch>
      </div>
    </Router>
  </div>
}
