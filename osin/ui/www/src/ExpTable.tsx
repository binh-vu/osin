import React, { useState, useEffect } from 'react';
import {
    useParams
} from "react-router-dom";

import { Table, Button, TablePaginationConfig, Checkbox } from 'antd';
import axios from 'axios';

interface Props {

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
    let columnNames = [];
}

export default function ExpTable(props: Props) {
    let { tableName } = useParams<{ tableName: string }>();
    let [records, setRecords] = useState('records');
    let [tableInfo, setTableInfo] = useState({
        columns: [],
        loading: true,
    });

    // query table from the server

    return <h2>{tableName} haha</h2>;
}