import React from 'react';
import {
  withRouter,
  RouteComponentProps
} from "react-router-dom";

import { Table, Button, TablePaginationConfig, Checkbox, Menu, Dropdown, Typography, Divider } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import axios from 'axios';
import memoizeOne from 'memoize-one';
import TableSchema from "./TableSchema";
import { inject, observer } from "mobx-react";
import { Store } from "./Store";
import { toJS } from 'mobx';

interface Props extends RouteComponentProps<{ tableName: string }> {
  store?: Store
}

interface State {
  records: { [id: string]: string }[],
  antdColumns: any[],
  loading: boolean,
  showDeleted: boolean,
  descending: boolean,
  total: number;
  pageSize: number;
  pageNo: number;
  selectedRows: string[],
  showSchema: boolean,
}

@inject('store')
@observer
class ExpTable extends React.Component<Props, State> {
  public state: State = {
    records: [],
    antdColumns: [],
    loading: true,
    showDeleted: false,
    showSchema: false,
    descending: true,
    total: 0,
    pageNo: 1,
    pageSize: 10,
    selectedRows: []
  }

  get tableName() {
    return this.props.match.params.tableName;
  }

  componentDidMount = () => {
    this.updateData(this.tableName, this.state.showDeleted, this.state.descending, this.state.pageSize, this.state.pageNo);
  }

  componentDidUpdate = (props: Props) => {
    this.updateData(this.tableName, this.state.showDeleted, this.state.descending, this.state.pageSize, this.state.pageNo);
  }

  deleteRecord = (recordId: string) => {
    this.setState({ loading: true });
    axios.delete(`/api/v1/runs/${recordId}`)
      .then(() => {
        this.updateData(this.tableName, this.state.showDeleted, this.state.descending, this.state.pageSize, this.state.pageNo, recordId);
      });
  }

  onSelectRows = (selectedRowKeys: any[]) => {
    this.setState({ selectedRows: selectedRowKeys });
  }

  restoreSelectedRows = () => {
    axios.post(`/api/v1/runs/restore`, { run_ids: this.state.selectedRows })
      .then(() => {
        this.updateData(this.tableName, this.state.showDeleted, this.state.descending, this.state.pageSize, this.state.pageNo, JSON.stringify(this.state.selectedRows));
      });
  }

  deleteSelectedRows = () => {
    axios.post(`/api/v1/runs/delete`, { run_ids: this.state.selectedRows })
      .then(() => {
        this.updateData(this.tableName, this.state.showDeleted, this.state.descending, this.state.pageSize, this.state.pageNo, JSON.stringify(this.state.selectedRows));
      });
  }

  updatePagination = (pagination: TablePaginationConfig) => {
    this.setState({ pageNo: pagination.current!, pageSize: pagination.pageSize! });
  }

  public render() {
    let store = this.props.store!;
    let schema = store.schemas[this.tableName];
    let antdColumns = [];
    if (schema !== undefined) {
      for (let antdCol of this.state.antdColumns) {
        let col = schema.columns[antdCol.dataIndex];
        if (col === undefined || col.visibility !== false) {
          antdColumns.push(antdCol);
        }
      }
    } else {
      antdColumns = this.state.antdColumns;
    }

    return <React.Fragment>
      <div className="mt-8 mb-8">
        <Typography.Text strong={true} keyboard={true}>
          SEARCH
        </Typography.Text>
        <Checkbox
          className="ml-12"
          onChange={(e) => this.setState({ showDeleted: e.target.checked })}
          checked={this.state.showDeleted}>Show deleted runs</Checkbox>
        <Checkbox
          onChange={(e) => this.setState({ descending: e.target.checked })}
          checked={this.state.descending}>Sort Descending</Checkbox>
      </div>
      <div className="mt-8 mb-8">
        <Typography.Text strong={true} type="secondary">
          ACTIONS
        </Typography.Text>
        <Button className="ml-16" size="small"
          onClick={() => this.setState({ showSchema: !this.state.showSchema })}>
          {this.state.showSchema ? "Hide settings" : "Show settings"}
        </Button>
        <Button className="ml-4" type="primary" size="small"
          onClick={() => this.restoreSelectedRows()}
          disabled={this.state.selectedRows.length == 0}>
          Restore
        </Button>
        <Button className="ml-4" type="primary" danger={true} size="small"
          onClick={() => this.deleteSelectedRows()}
          disabled={this.state.selectedRows.length == 0}>
          Delete
        </Button>
        {this.state.selectedRows.length > 0 ?
          <Typography.Text strong={true} type="danger" className="ml-4">
            {this.state.selectedRows.length} rows selected
          </Typography.Text>
          : null
        }
        <div className="mt-8 mb-8">
          <TableSchema show={this.state.showSchema} tableName={this.tableName} />
        </div>
      </div>
      <Table
        size="small"
        dataSource={this.state.records.slice(0, this.state.pageSize)}
        rowKey={"id"}
        pagination={{
          position: ["topLeft", "bottomLeft"],
          total: this.state.total,
          current: this.state.pageNo,
          pageSize: this.state.pageSize,
          pageSizeOptions: ["5", "10", "20", "50", "100", "10000"],
          showSizeChanger: true,
          showTotal: (total: number) => `Total ${total} items`,
        }}
        columns={antdColumns}
        loading={this.state.loading}
        onChange={this.updatePagination}
        scroll={{ x: 'max-content', scrollToFirstRowOnChange: true }}
        rowSelection={{
          onChange: this.onSelectRows,
        }}
      />
    </React.Fragment>;
  }

  updateData = memoizeOne(async (tableName: string, showDeleted: boolean, descending: boolean, pageSize: number, pageNo: number, key?: string) => {
    this.setState({ loading: true });
    // query data from the server
    let schemaResp = await axios.get("/api/v1/tables", {
      params: {
        table: tableName
      }
    });
    let runsResp = await axios.get('/api/v1/runs', {
      params: {
        table: tableName,
        limit: pageSize,
        offset: (pageNo - 1) * pageSize,
        include_deleted: showDeleted ? "true" : "false",
        order: descending ? "desc" : "asc"
      }
    });
    let total = runsResp.data.total;
    let records = runsResp.data.records;
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
    if (columns.length > 0) {
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
    }
    this.setState({
      loading: false,
      records,
      antdColumns: columns,
      // columnVisibilities: schemaResp.data.column_visibilities,
      total,
      selectedRows: []
    });
  });
}

export default withRouter(ExpTable);
