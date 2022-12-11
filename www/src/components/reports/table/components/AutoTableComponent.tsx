import { makeStyles } from "@mui/styles";
import { Alert, Dropdown, Modal } from "antd";
import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { AttrGetter } from "models/reports";
import { useMemo, useState } from "react";
import { Attribute, AutoTableReportData, ReportData } from "../../ReportData";
import { Cell, Table, TableBuilder } from "../TableBuilder";
import { observer } from "mobx-react";
import {
  CellComponent,
  ExtraCell,
  extraCellFactory,
  imputeCellData,
  highlightTable,
  CellStatistics,
} from "./CellComponent";
import {
  HighlightMode,
  ReportTableRenderConfig,
  ReportTableRenderConfigStore,
  ZValueStyle,
} from "./ReportTableRenderConfig";
import { toJS } from "mobx";

export const AutoTableComponent = ({
  reportData,
}: {
  reportData: AutoTableReportData;
}) => {
  const table = useTable(reportData);

  return (
    <table>
      <tbody>
        {table.map((row, i) => {
          return (
            <tr key={i}>
              {row.map((cell, j) => {
                return <AutoCellComponent key={`${i}-${j}`} cell={cell} />;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export const AutoCellComponent = ({ cell }: { cell: AutoTableCell }) => {
  if (cell.th) {
    return <th>{cell.label}</th>;
  }

  return <td>{cell.label}</td>;
};

export interface AutoTableCell {
  row: number;
  col: number;
  label: string | number;
  // whether the cell is a header
  th: boolean;
}

export interface AutoTable {
  cells: AutoTableCell[][];
}

function useTable(reportData: AutoTableReportData) {
  const cells = useMemo(() => {
    const valueHeader = buildHeader(reportData.valueHeaders);
    const attrHeaders = reportData.groups.map((g) =>
      buildHeader(g[1].attrHeaders)
    );

    const attrHeaderWidth = _.maxBy(
      reportData.groups,
      (g) => g[1].attrHeaders.length
    )![1].attrHeaders.length;
    const width = attrHeaderWidth + reportData.valueHeaders.length;
    const height =
      valueHeader.length +
      _.sum(reportData.groups.map((g) => g[1].rows.length)) +
      _.sumBy(attrHeaders, "length") +
      reportData.groups.length;

    const cells = ArrayHelper.new2d(height, width, (i, j) => ({
      label: "",
      th: false,
      row: i,
      col: j,
    }));

    // set the value headers
    for (let i = 0; i < valueHeader.length; i++) {
      for (let j = 0; j < valueHeader[0].length; j++) {
        Object.assign(cells[i][j + attrHeaderWidth], valueHeader[i][j]);
      }
    }

    // set the attribute headers & the table data
    let startrow = valueHeader.length;
    for (let gi = 0; gi < reportData.groups.length; gi++) {
      const [groupName, groupData] = reportData.groups[gi];
      // for (let [groupName, groupData] of reportData.groups) {
      // set the attribute headers
      Object.assign(cells[startrow][0], { label: groupName, th: true });
      startrow++;

      const attrHeader = attrHeaders[gi];
      for (let i = 0; i < attrHeader.length; i++) {
        for (let j = 0; j < attrHeader[0].length; j++) {
          cells[i + startrow][j] = {
            ...attrHeader[i][j],
            row: i + startrow,
            col: j,
          };
        }
      }
      startrow += attrHeader.length;

      // set the table data
      for (let i = 0; i < groupData.rows.length; i++) {
        const row = groupData.rows[i];
        for (let j = 0; j < attrHeaders[0].length; j++) {
          cells[i + startrow][j].label = row.headers[j];
        }
        for (let j = attrHeaderWidth; j < width; j++) {
          cells[i + startrow][j].label = row.values[j - attrHeaderWidth];
        }
      }
      startrow += groupData.rows.length;
    }

    return cells;
  }, [reportData]);

  return cells;
}

function buildHeader(attrs: Attribute[]) {
  const width = attrs.length;
  const height = _.maxBy(attrs, (a) => a.path.length)!.path.length;

  const headers = ArrayHelper.new2d(height, width, (i, j) => ({
    label: "",
    th: true,
  }));

  // do not sort the attribute as it related to the order of columns in each row data returned by the server,
  // even if it looks ugly.
  for (let j = 0; j < attrs.length; j++) {
    const attr = attrs[j];
    for (let i = 0; i < attr.path.length; i++) {
      const label = attr.path[i];
      headers[i][j].label = label;
    }
  }

  // TODO: merge attrs with the same path so that it's easier to read

  return headers;
}
