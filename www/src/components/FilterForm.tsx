import { Input } from "antd";
import { QueryConditions } from "gena-app";
import React, { useState } from "react";

export interface FilterFormProps<R> {
  style?: React.CSSProperties;
  onSearch?: (conditions: QueryConditions<R>) => void;
  value?: string;
  onChange?: (value: string) => void;
}

/** A filter form (for filtering rows in tables)*/
export const FilterForm = <R,>({
  style,
  onSearch,
  value,
  onChange,
}: FilterFormProps<R>) => {
  const [internalValue, setInternalValue] = useState("");

  return (
    <div style={style}>
      <Input.Search
        placeholder="input search text"
        allowClear={true}
        enterButton="Search"
        value={value !== undefined ? value : internalValue}
        onChange={
          value !== undefined && onChange !== undefined
            ? (e) => onChange(e.target.value)
            : (e) => setInternalValue(e.target.value)
        }
        onSearch={(value) => {
          if (onSearch !== undefined) {
            onSearch(textToQuery(value));
          }
        }}
      />
    </div>
  );
};

const textToQuery = <R,>(text: string): QueryConditions<R> => {
  return {};
};
