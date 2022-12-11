import { InternalLink } from "gena-app";
import _ from "lodash";
import { ArrayHelper } from "misc";
import { useMemo } from "react";
import { routes } from "routes";
import { Attribute, AutoTableReportData } from "../../ReportData";
import {
  BaseCell,
  BaseTable,
  BaseTableComponent,
} from "./base/BaseTableComponent";

export const AutoTableComponent = ({
  title,
  footnote,
  reportData,
}: {
  title?: string | React.ReactNode;
  footnote?: string | React.ReactNode;
  reportData: AutoTableReportData;
}) => {
  const table = useTable(reportData);
  return (
    <BaseTableComponent
      table={table}
      cellProps={{}}
      title={title}
      footnote={footnote}
    />
  );
};

function useTable(reportData: AutoTableReportData) {
  const table = useMemo(() => {
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

    const cells = ArrayHelper.new2d(
      height,
      width,
      (i, j): BaseCell => ({
        label: "",
        row: i,
        col: j,
        th: false,
        metaTh: false,
        rowSpan: 1,
        colSpan: 1,
      })
    );

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
      Object.assign(cells[startrow][0], {
        label: groupName,
        th: true,
        metaTh: true,
        colSpan: attrHeaderWidth,
      });
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
          const label = row.headers[j];
          cells[i + startrow][j].label = label === null ? "<null>" : label;
        }
        for (let j = attrHeaderWidth; j < width; j++) {
          const label = row.values[j - attrHeaderWidth];
          cells[i + startrow][j].label = label === null ? "<null>" : label;
        }
      }
      startrow += groupData.rows.length;
    }

    return new BaseTable(cells, height, width);
  }, [reportData]);

  const table2 = useMemo(() => {
    const table2 = table.clone();
    return table2.fixSpanning();
  }, [table]);

  return table2;
}

function buildHeader(attrs: Attribute[]) {
  const width = attrs.length;
  const height = _.maxBy(attrs, (a) => a.path.length)!.path.length;

  const headers = ArrayHelper.new2d(
    height,
    width,
    (i, j): Omit<BaseCell, "row" | "col"> => ({
      label: "",
      th: true,
      metaTh: false,
      rowSpan: 1,
      colSpan: 1,
    })
  );

  // do not sort the attribute as it related to the order of columns in each row data returned by the server,
  // even if it looks ugly.
  for (let j = 0; j < attrs.length; j++) {
    const attr = attrs[j];
    for (let i = 0; i < attr.path.length; i++) {
      const label = attr.path[i];
      headers[i][j].label = label;
    }
  }

  // merge attrs with the same path so that it's easier to read
  // there is one caveat that if the next attribute is a child of the previous attribute
  // then, spanning won't make sense (it also won't make sense if the next attribute is a child of the previous attribute)
  // so we need to disable spanning in that case.
  if (attrs.slice(1).every((a, i) => !a.isChildOf(attrs[i]))) {
    const cmpLevel = ArrayHelper.zeros(height);
    for (let j = 1; j < attrs.length; j++) {
      const attr = attrs[j];
      let hasMatched = true;
      for (let i = 0; i < attr.path.length; i++) {
        if (
          cmpLevel[i] !== -1 &&
          hasMatched &&
          attrs[cmpLevel[i]].path[i] === attr.path[i]
        ) {
          // same path, so we can merge
          headers[i][cmpLevel[i]].colSpan++;
        } else {
          // different path, so we need to reset the cmpLevel to point to the latest attribute
          cmpLevel[i] = j;
          hasMatched = false;
        }
      }

      // the attr is shorter than the previous attr, so we mark the rest of the cmpLevel as -1
      for (let i = attr.path.length; i < height; i++) {
        cmpLevel[i] = -1;
      }

      if (attr.path.length < height) {
        // the attr is shorter than the max height, so we allow it span to the bottom
        headers[attr.path.length - 1][j].rowSpan =
          height - attr.path.length + 1;
      }
    }
  }
  return headers;
}
