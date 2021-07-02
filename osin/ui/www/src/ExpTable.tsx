import React, { useState, useEffect, useCallback } from 'react';
import {
  useParams,
  withRouter,
  RouteComponentProps
} from "react-router-dom";

import { Table, Button, TablePaginationConfig, Checkbox } from 'antd';
import axios from 'axios';
import memoizeOne from 'memoize-one';

interface Props extends RouteComponentProps<{ tableName: string }> {
}

interface State {
  records: { [id: string]: string }[],
  columns: any[],
  loading: boolean,
  showDeleted: boolean,
  descending: boolean,
  total: number;
  pageSize: number;
  pageNo: number;
}

class ExpTable extends React.Component<Props, State> {
  public state: State = {
    records: [],
    columns: [],
    loading: true,
    showDeleted: false,
    descending: true,
    total: 0,
    pageNo: 1,
    pageSize: 100
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

  updatePagination = (pagination: TablePaginationConfig) => {
    this.setState({ pageNo: pagination.current!, pageSize: pagination.pageSize! });
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
          position: ["topRight", "bottomRight"],
          total: this.state.total,
          current: this.state.pageNo,
          pageSize: this.state.pageSize,
          pageSizeOptions: ["5", "10", "20", "50", "100", "10000"],
          showSizeChanger: true,
          showTotal: (total: number) => `Total ${total} items`,
        }}
        columns={this.state.columns}
        loading={this.state.loading}
        onChange={this.updatePagination}
      />
    </React.Fragment>;
  }

  updateData = memoizeOne(async (tableName: string, showDeleted: boolean, descending: boolean, pageSize: number, pageNo: number, key?: string) => {
    this.setState({ loading: true });
    // query data from the server
    let resp = await axios.get('/api/v1/runs', {
      params: {
        table: tableName,
        limit: pageSize,
        offset: (pageNo - 1) * pageSize,
        include_deleted: showDeleted ? "true" : "false",
        order: descending ? "desc" : "asc"
      }
    });
    let total = resp.data.total;
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
    this.setState({ loading: false, records, columns, total });
  });
}

export default withRouter(ExpTable);
