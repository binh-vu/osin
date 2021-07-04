import React, { useState, useEffect } from 'react';
import { List, Typography, Checkbox, Select, Divider, Button } from "antd";
import axios from 'axios';
import { toJS } from "mobx";
import { observer, inject } from "mobx-react";
import { ColumnSchema, TableSchema, Store, MobxProviderProps } from "./Store";

const TableSchemaComponent = (props: {
  show: boolean, tableName: string,
  store?: Store,
}) => {
  let store = props.store!;
  let schema: TableSchema | undefined = store.schemas[props.tableName];
  let version = schema === undefined ? undefined : schema.version;

  useEffect(() => {
    store.downloadSchema(props.tableName);
  }, [props.tableName, version]);

  if (schema === undefined) {
    return null;
  }

  let items = [];
  for (let column of Object.values(schema.columns)) {
    const item = <List.Item key={column.name}>
      <div>
        <Checkbox checked={column.visibility}
          onClick={(e: any) => { column.setVisibility(e.target.checked); }}>
          show
        </Checkbox>
        <Divider type="vertical" />
        <Typography.Text strong={true} style={{ width: 100 }} ellipsis={{ tooltip: column.name }}>
          {column.name}
        </Typography.Text>
        <Divider type="vertical" />
        <Select value={column.type} className="ml-4">
          <Select.Option value="auto">auto</Select.Option>
          <Select.Option value="string">string</Select.Option>
          <Select.Option value="number">number</Select.Option>
        </Select>
      </div>
    </List.Item>;

    items.push(item);
  }

  return <div className={props.show ? "" : "hide"}>
    <List
      bordered={true}>
      {items}
    </List>
    <Button
      type="primary" className="mt-8" onClick={() => schema!.save()}
      disabled={!schema.hasChanged}
    >
      Save
    </Button>
  </div>
};

export default inject('store')(observer(TableSchemaComponent));