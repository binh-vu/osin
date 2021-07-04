import React from 'react';
import './App.css';
import { Table, Button, TablePaginationConfig, Checkbox } from 'antd';
import axios from 'axios';

interface Props {

}

interface TableRow {

}

interface State {
  rows: { [col: string]: string }[];
  columns: any[];
  loading: boolean;
  showDeleted: boolean;
  pagination: {
    total: number;
    current: number;
    pageSize: number;
  };
  descending: boolean;
}

export default class App extends React.Component<Props, State> {
  public state: State = {
    rows: [],
    columns: [],
    loading: true,
    showDeleted: false,
    descending: true,
    pagination: {
      total: 0,
      current: 1,
      pageSize: 500000,
    }
  }

  get tableName() {
    return window.location.pathname.replace("/exps/", "");
  }

  componentDidMount() {
    this.queryTable(this.tableName, this.state.pagination.pageSize, (this.state.pagination.current - 1) * this.state.pagination.pageSize, this.state.showDeleted, this.state.descending);
  }

  changePage = (pagination: TablePaginationConfig,
    _filters?: any,
    _sorter?: any) => {
  }

  queryTable = (table: string, limit: number, offset: number, includeDeleted: boolean, descending: boolean) => {
    this.setState({ loading: true });
    return axios.get('/api/v1/runs', {
      params: { table, limit, offset, include_deleted: includeDeleted ? "true" : "false", order: descending ? 'desc' : 'asc' }
    }).then((resp) => {
      let columns = resp.data.columns.map((name: string) => ({
        title: name,
        dataIndex: name,
        key: name
      }));
      columns.push({
        title: "Action",
        key: '__action__',
        render: (text: string, record: any) => {
          return <Button type="primary" danger={true} onClick={this.deleteRecord(record.id)}>Delete</Button>
        }
      });
      this.setState({
        rows: resp.data.records,
        columns,
        loading: false
      })
    })
  }

  deleteRecord = (recordId: string) => {
    return () => {
      this.setState({ loading: true });
      return axios.delete(`/api/v1/runs/${recordId}`).then((resp) => {
        this.setState({ loading: false, rows: this.state.rows.filter((row) => row.id !== recordId) });
      });
    }
  }

  onToggleDeleted = (e: any) => {
    if (e.target.checked !== this.state.showDeleted) {
      this.setState({ showDeleted: e.target.checked });
      this.queryTable(this.tableName, this.state.pagination.pageSize, (this.state.pagination.current - 1) * this.state.pagination.pageSize, e.target.checked, this.state.descending);
    }
  }

  onToggleSearchOrder = (e: any) => {
    if (e.target.checked !== this.state.descending) {
      this.setState({ descending: e.target.checked });
      this.queryTable(this.tableName, this.state.pagination.pageSize, (this.state.pagination.current - 1) * this.state.pagination.pageSize, this.state.showDeleted, e.target.checked);
    }
  }

  render() {
    return <div>
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <Checkbox onChange={this.onToggleDeleted} checked={this.state.showDeleted}>Show deleted runs</Checkbox>
        <Checkbox onChange={this.onToggleSearchOrder} checked={this.state.descending}>Sort Descending</Checkbox>
      </div>
      <Table
        size="small"
        dataSource={this.state.rows}
        rowKey={"id"}
        pagination={{
          total: this.state.pagination.total,
          current: this.state.pagination.current,
          pageSize: this.state.pagination.pageSize,
          pageSizeOptions: ["5", "10", "20", "50", "100", '200', '500', '1000'],
          showSizeChanger: true,
          showTotal: (total: number) => `Total ${total} items`,
        }}
        columns={this.state.columns}
        loading={this.state.loading}
        onChange={this.changePage}
      />
    </div>
  }
}
