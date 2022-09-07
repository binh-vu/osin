import './App.css';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";
import ExpTable from "./ExpTable";

export default function App() {
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
