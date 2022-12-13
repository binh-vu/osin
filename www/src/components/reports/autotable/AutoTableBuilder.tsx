import { ClassNameMap } from "@mui/styles";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { useMemo } from "react";
import { highlight } from "../basetable";
import {
  BaseCellLabelComponent,
  BaseCellSortable,
} from "../basetable/BaseComponents";
import {
  Attribute,
  AutoTableReportData,
  AutoTableReportRowData,
} from "../ReportData";
import { AutoTable, Cell, CellData } from "./AutoTable";
import { AutoTableRenderConfig } from "./AutoTableRenderConfig";

export function useTable(
  reportData: AutoTableReportData,
  classes: ClassNameMap<
    "metaHeader" | "header" | "lastHeader" | "uselessHeader"
  >,
  renderConfig: AutoTableRenderConfig
): AutoTable {
  const table = useMemo(() => {
    const valueHeader = buildHeader(reportData.valueHeaders, classes);
    const attrHeaders = reportData.groups.map((g) =>
      buildHeader(g[1].attrHeaders, classes)
    );
    const groupDatas = reportData.groups.map((g) => g[1].rows).map(groupRows);

    const attrHeaderWidth = _.maxBy(
      reportData.groups,
      (g) => g[1].attrHeaders.length
    )![1].attrHeaders.length;
    const width = attrHeaderWidth + reportData.valueHeaders.length;
    const height =
      valueHeader.length +
      _.sum(groupDatas.map((g) => g.length)) +
      _.sumBy(attrHeaders, "length") +
      reportData.groups.length;

    const cells = ArrayHelper.new2d(
      height,
      width,
      (i, j): Cell => ({
        label: "",
        row: i,
        col: j,
        th: false,
        metaTh: false,
        rowSpan: 1,
        colSpan: 1,
        data: CellData.default(),
        style: {},
      })
    );
    cells[0][0].th = true;
    cells[0][0].colSpan = attrHeaderWidth;
    cells[0][0].rowSpan = valueHeader.length;

    // set the value headers
    for (let i = 0; i < valueHeader.length; i++) {
      for (let j = 0; j < valueHeader[0].length; j++) {
        Object.assign(cells[i][j + attrHeaderWidth], valueHeader[i][j]);
      }
    }

    // set the attribute headers & the table data
    let startrow = valueHeader.length;
    const groupRanges = [];

    for (let gi = 0; gi < reportData.groups.length; gi++) {
      const groupName = reportData.groups[gi][0];
      const groupData = groupDatas[gi];
      // set the attribute headers
      Object.assign(cells[startrow][0], {
        label: groupName,
        th: true,
        metaTh: true,
        colSpan: attrHeaderWidth,
        className: classes.metaHeader,
      });
      Object.assign(cells[startrow][attrHeaderWidth], {
        th: true,
        metaTh: true,
        colSpan: width - attrHeaderWidth,
        className: classes.metaHeader,
      });
      startrow++;

      const attrHeader = attrHeaders[gi];
      for (let i = 0; i < attrHeader.length; i++) {
        for (let j = attrHeaderWidth; j < width; j++) {
          cells[i + startrow][j].th = true;
          cells[i + startrow][j].className = classes.uselessHeader;
        }
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
      for (let i = 0; i < groupData.length; i++) {
        const row = groupData[i][0];
        const recordIds = groupData[i].map((r) => r.recordId);
        for (let j = 0; j < attrHeader[0].length; j++) {
          const label = row.headers[j];
          cells[i + startrow][j].label = label === null ? "<null>" : label;
        }
        for (let j = attrHeaderWidth; j < width; j++) {
          const data = new CellData(
            recordIds,
            groupData[i].map((r) => r.values[j - attrHeaderWidth])
          );
          const tmp: Partial<Cell> = {
            label: <BaseCellLabelComponent data={data} />,
            data,
          };
          Object.assign(cells[i + startrow][j], tmp);
        }
      }
      startrow += groupData.length;
      groupRanges.push({
        start: startrow - groupData.length,
        end: startrow,
        name: groupName,
      });
    }

    return new AutoTable(
      cells,
      height,
      width,
      attrHeaderWidth,
      valueHeader.length,
      groupRanges
    );
  }, [reportData]);

  const table2 = useMemo(() => {
    const table2 = table.clone();

    // update the ui to show the sorted order
    for (let j = table2.attrHeaderWidth; j < table2.ncols; j++) {
      // the order of `i` is important, must be increase as the logic of `isLeafValueHeaderCell`
      for (let i = 0; i < table2.valueHeaderHeight; i++) {
        const cell = table2.data[i][j];
        if (table2.isLeafValueHeaderCell(cell)) {
          cell.label = (
            <BaseCellSortable
              label={cell.label}
              sortOrder={renderConfig.getSortedOrder(cell.col)}
            />
          );
          break;
        }
      }
    }

    // highlight the cells
    highlight(table2, renderConfig.highlight, {
      rowstart: table2.valueHeaderHeight,
      colstart: table2.attrHeaderWidth,
    });

    // then we can sort the table
    table2.sort(renderConfig.sorts);

    return table2.fixSpanning();
  }, [table, renderConfig.highlight, renderConfig.sortKey]);

  return table2;
}

export function buildHeader(
  attrs: Attribute[],
  classes: ClassNameMap<"metaHeader" | "header" | "lastHeader">
) {
  const width = attrs.length;
  const height = _.maxBy(attrs, (a) => a.path.length)!.path.length;

  const headers = ArrayHelper.new2d(
    height,
    width,
    (i, j): Omit<Cell, "row" | "col"> => ({
      label: "",
      th: true,
      metaTh: false,
      rowSpan: 1,
      colSpan: 1,
      data: CellData.default(),
      style: {},
    })
  );

  // do not sort the attribute as it related to the order of columns in each row data returned by the server,
  // even if it looks ugly.
  for (let j = 0; j < attrs.length; j++) {
    const attr = attrs[j];
    for (let i = 0; i < attr.path.length; i++) {
      const label = attr.path[i];
      Object.assign(headers[i][j], {
        label,
        className: getClassName(
          classes.header,
          i === attr.path.length - 1 ? classes.lastHeader : undefined
        ),
      });
    }
  }

  // merge attrs with the same path so that it's easier to read
  // there is one caveat that if the next attribute is a child of the previous attribute
  // then, spanning won't make sense (it also won't make sense if the next attribute is a child of the previous attribute)
  // so we need to disable spanning in that case.
  if (attrs.slice(1).every((a, i) => !a.isChildOf(attrs[i]))) {
    const cmpLevel = ArrayHelper.zeros(height);
    if (attrs[0].path.length < height) {
      headers[attrs[0].path.length - 1][0].rowSpan =
        height - attrs[0].path.length + 1;
    }
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

export function groupRows(
  rows: AutoTableReportRowData[]
): AutoTableReportRowData[][] {
  const obj = new Map();
  for (const row of rows) {
    const key = JSON.stringify(row.headers);
    if (obj.has(key)) {
      obj.get(key).push(row);
    } else {
      obj.set(key, [row]);
    }
  }

  return Array.from(obj.values());
}
