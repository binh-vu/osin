import { Render, TableComponent, TableComponentFunc } from "components/table";
import memoizeOne from "memoize-one";
import {
  PyOTable,
  PyOTableCell,
  PyOTablePrimitiveCell,
  PyOTableRow,
} from "models/experiments/pyobject";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Space } from "antd";
import { FilterDropdownProps } from "antd/es/table/interface";
import { QueryConditions } from "gena-app";
import Fuse from "fuse.js";
import _ from "lodash";

export const getTextSearchFilterProps = (
  query: string,
  setQuery: (query: string) => void,
  onSearch: (query: string) => void
) => {
  return {
    filterIcon: (filtered: boolean) => {
      return (
        <SearchOutlined
          style={{ color: query.length > 0 ? "#1890ff" : undefined }}
        />
      );
    },
    filterDropdown: (props: FilterDropdownProps) => (
      <SearchFilterDropdownComponent
        query={query}
        setQuery={setQuery}
        onSearch={(query) => {
          props.confirm();
          onSearch(query);
        }}
      />
    ),
  };
};

const SearchFilterDropdownComponent = ({
  query,
  setQuery,
  onSearch,
}: {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (query: string) => void;
}) => {
  return (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        placeholder={`Enter keywords...`}
        value={query}
        allowClear={true}
        onChange={(e) => setQuery(e.target.value)}
        onPressEnter={() => onSearch(query)}
      />
    </div>
  );
};

export function sortRecords<R>(
  records: R[],
  sorts: {
    field: keyof R;
    order: "desc" | "asc";
  }[]
) {
  if (sorts.length === 0) {
    return records;
  }
  const newrecords = records.slice();
  newrecords.sort(getCompareFn(sorts));
  return newrecords;
}

function getCompareFn<R>(
  sorts: {
    field: keyof R;
    order: "desc" | "asc";
  }[]
) {
  return (r1: R, r2: R) => {
    for (const sort of sorts) {
      const v1 = r1[sort.field] as string | number;
      const v2 = r2[sort.field] as string | number;
      if (v1 === null || v2 === null) {
        if (v1 === v2) continue;
        if (v1 === null) return sort.order === "asc" ? -1 : 1;
        if (v2 === null) return sort.order === "asc" ? 1 : -1;
      }
      if (v1 < v2) {
        return sort.order === "asc" ? -1 : 1;
      }
      if (v1 > v2) {
        return sort.order === "asc" ? 1 : -1;
      }
    }
    return 0;
  };
}
