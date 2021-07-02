import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams,
  withRouter,
  RouteComponentProps
} from "react-router-dom";

import { Table, Button, TablePaginationConfig, Checkbox } from 'antd';
import axios from 'axios';

interface Props extends RouteComponentProps<{ tableName: string }> {
}

interface State {
  records: { [id: string]: string }[],
  columns: any[],
  loading: boolean,
  showDeleted: boolean,
  descending: boolean,
}

class ExpTable2 extends React.Component<Props, State> {
  public state: State = {
    records: [],
    columns: [],
    loading: true,
    showDeleted: false,
    descending: true,
  }

  get tableName() {
    return this.props.match.params.tableName;
  }

  componentDidMount = () => {
    this.reloadData();
  }

  componentDidUpdate = (props: Props) => {
    if (this.tableName !== props.match.params.tableName) {
      this.reloadData();
    }
  }

  public reloadData = () => {
    this.setState({ loading: true });
    query(this.tableName, 500, 0, this.state.showDeleted, this.state.descending)
      .then(({ records, columns }) => {
        columns.push({
          title: 'ACTIONS',
          key: '__action_58172__',
          render: (text: string, record: any) => {
            return <React.Fragment>
              <Button type="primary" danger={true} onClick={() => this.deleteRecord(record.id)}>Delete</Button>
              {this.state.showDeleted && record.deleted ? <Button type="primary" className="ml-4">Restore</Button> : null}
            </React.Fragment>
          }
        });
        this.setState({ loading: false, records, columns });
      });
  }

  public deleteRecord = (recordId: string) => {
    this.setState({ loading: true });
    axios.delete(`/api/v1/runs/${recordId}`)
      .then(() => {
        this.reloadData();
      });
  }

  public render() {
    return <React.Fragment>
      <div className="mt-8 mb-8">
        <Checkbox
          onChange={(e) => this.setState({ showDeleted: e.target.checked })}
          checked={this.state.showDeleted}>Show deleted runs</Checkbox>
        <Checkbox
          onChange={(e) => this.setState({ descending: e.target.checked })}
          checked={this.state.descending}>Sort Descending</Checkbox>
      </div>
      <Table
        size="small"
        dataSource={this.state.records}
        rowKey={"id"}
        pagination={{
          total: 1000,
          current: 1,
          pageSize: 50,
          pageSizeOptions: ["5", "10", "20", "50", "100", '200', '500', '1000'],
          showSizeChanger: true,
          showTotal: (total: number) => `Total ${total} items`,
        }}
        columns={this.state.columns}
        loading={this.state.loading}
        onChange={(pagination) => this.setState({})}
      />
    </React.Fragment>;
  }
}

/**
 * Query table from the server
 * 
 * @param tableName 
 * @param limit 
 * @param offset 
 * @param includeDeleted 
 * @param descending 
 */
async function query(tableName: string, limit: number, offset: number, includeDeleted: boolean, descending: boolean) {
  let resp = await axios.get('/api/v1/runs', {
    params: {
      table: tableName,
      limit,
      offset,
      include_deleted: includeDeleted ? "true" : "false",
      order: descending ? "desc" : "asc"
    }
  });
  let records = resp.data.records;
  // create list of columns dynamically from the records
  let columns: any = {};
  for (let record of records) {
    for (let cname of Object.keys(record)) {
      if (columns[cname] === undefined) {
        columns[cname] = {
          title: cname.toUpperCase(),
          dataIndex: cname,
          key: cname
        };
      }
    }
  }
  columns = Object.values(columns);
  return { records, columns };
}

export default withRouter(ExpTable2);

// function ExpTable() {
//   let { tableName } = useParams<{ tableName: string }>();
//   let [state, setState] = useState({
//     version: 0,
//     records: [],
//     columns: [],
//     loading: true,
//     showDeleted: false,
//     descending: true,
//   });

//   function deleteRecord(recordId: string) {
//     setState({ ...state, loading: true });
//     axios.delete(`/api/v1/runs/${recordId}`)
//       .then(() => {
//         setState({ ...state, version: state.version + 1 });
//       });
//   }

//   // query table from the server
//   useEffect(() => {
//     setState({ ...state, loading: true });
//     query(tableName, 500, 0, state.showDeleted, state.descending)
//       .then(({ records, columns }) => {
//         columns.push({
//           title: 'ACTIONS',
//           key: '__action_58172__',
//           render: (text: string, record: any) => {
//             return <React.Fragment>
//               <Button type="primary" danger={true} onClick={() => deleteRecord(record.id)}>Delete</Button>
//               {state.showDeleted && record.deleted ? <Button type="primary" className="ml-4">Restore</Button> : null}
//             </React.Fragment>
//           }
//         });
//         setState({ ...state, loading: false, records, columns });
//       });
//   }, [tableName, state.showDeleted, state.descending, state.version]);

//   return <React.Fragment>
//     <div className="mt-8 mb-8">
//       <Checkbox
//         onChange={(e) => setState({ ...state, showDeleted: e.target.checked })}
//         checked={state.showDeleted}>Show deleted runs</Checkbox>
//       <Checkbox
//         onChange={(e) => setState({ ...state, descending: e.target.checked })}
//         checked={state.descending}>Sort Descending</Checkbox>
//     </div>
//     <Table
//       size="small"
//       dataSource={state.records}
//       rowKey={"id"}
//       pagination={{
//         total: 1000,
//         current: 1,
//         pageSize: 50,
//         pageSizeOptions: ["5", "10", "20", "50", "100", '200', '500', '1000'],
//         showSizeChanger: true,
//         showTotal: (total: number) => `Total ${total} items`,
//       }}
//       columns={state.columns}
//       loading={state.loading}
//       onChange={(pagination) => setState({ ...state })}
//     />
//   </React.Fragment>;
// }