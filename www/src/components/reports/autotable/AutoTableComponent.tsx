import { ArgSchema, ArgType, InternalLink, PathDef } from "gena-app";
import _ from "lodash";
import { ArrayHelper, getClassName } from "misc";
import { useMemo, useState } from "react";
import { routes } from "routes";
import {
  Attribute,
  AutoTableReportData,
  AutoTableReportRowData,
} from "../ReportData";
import {
  BaseCellLabelComponent,
  BaseCellSortable,
  BaseTableComponent,
  Footnote,
  NumericCellDetails,
} from "../basetable/BaseComponents";
import { BaseTable } from "../basetable/BaseTable";
import { highlight, HighlightMode } from "../basetable";
import { ClassNameMap, makeStyles } from "@mui/styles";
import { observer } from "mobx-react";
import {
  AutoTableRenderConfig,
  AutoTableRenderConfigStore,
} from "./AutoTableRenderConfig";
import { AutoTable, Cell, CellData } from "./AutoTable";
import { blue } from "@ant-design/colors";
import { useTable } from "./AutoTableBuilder";
import { Modal } from "antd";

const useStyles = makeStyles({
  glow: {
    boxShadow: "0 0 0 4px rgb(5 145 255 / 10%)",
    borderInlineEndWidth: 1,
    border: `1.5px solid ${blue[5]}`,
    outline: 0,
  },
  header: {
    borderTop: "none !important",
    textAlign: "center",
  },
  metaHeader: {
    borderLeft: "none !important",
    borderRight: "none !important",
    borderBottom: "none !important",
    padding: "4px 0px !important",
    textAlign: "center",
    fontWeight: 700,
    color: "rgba(0, 0, 0, 0.55) !important",
    backgroundColor: "#f9f0ff",
  },
  uselessHeader: {
    borderTop: "none !important",
    borderBottom: "none !important",
    borderRight: "none !important",
  },
  lastHeader: {
    textAlign: "left !important" as "left",
  },
  cellModal: {
    width: "80% !important",
    maxHeight: "calc(100% - 40px)",
    top: 20,
    "& .ant-modal-header": {
      display: "none",
    },
  },
});

export const autoTableRenderConfigStore = new AutoTableRenderConfigStore();

export const AutoTableComponent = observer(
  <
    U extends Record<string, keyof ArgType>,
    Q extends Record<string, keyof ArgType>
  >({
    reportKey,
    title,
    reportData,
    viewURL,
    editURL,
    defaultHighlightMode = "none",
    renderRecordId,
    removeRecord,
  }: {
    reportKey: string;
    title?: string | React.ReactNode;
    reportData: AutoTableReportData;
    viewURL?: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    editURL?: {
      path: PathDef<U, Q>;
      urlArgs: ArgSchema<U>;
      queryArgs: ArgSchema<Q>;
    };
    defaultHighlightMode?: HighlightMode;
    renderRecordId?: (recordId: number) => React.ReactNode;
    removeRecord?: (recordId: number) => Promise<void>;
  }) => {
    const classes = useStyles();
    const [showCell, setShowCell] = useState<undefined | [number, number]>(
      undefined
    );

    if (!autoTableRenderConfigStore.configs.has(reportKey)) {
      autoTableRenderConfigStore.configs.set(
        reportKey,
        new AutoTableRenderConfig(defaultHighlightMode, [])
      );
    }
    const autoTableRenderConfig =
      autoTableRenderConfigStore.configs.get(reportKey)!;

    const table = useTable(reportData, classes, autoTableRenderConfig);

    let rowProps = undefined;
    if (
      typeof autoTableRenderConfig.highlight === "object" &&
      autoTableRenderConfig.highlight.type === "row"
    ) {
      const highlightRow = autoTableRenderConfig.highlight.value;
      rowProps = (table: AutoTable, row: number) => {
        if (table.ncols > 0 && table.data[row][0].row === highlightRow) {
          return {
            className: classes.glow,
          };
        }
        return {};
      };
    }

    return (
      <div>
        <BaseTableComponent<Cell, AutoTable, CellData>
          table={table}
          cellProps={{
            onClick: (cell, table) =>
              onCellClick(cell, table, autoTableRenderConfig, setShowCell),
          }}
          rowProps={rowProps}
          title={title}
          footnote={
            <Footnote
              actions={[
                viewURL !== undefined ? (
                  <InternalLink
                    path={viewURL.path}
                    urlArgs={viewURL.urlArgs}
                    queryArgs={viewURL.queryArgs}
                  >
                    view
                  </InternalLink>
                ) : undefined,
                editURL !== undefined ? (
                  <InternalLink
                    path={editURL.path}
                    urlArgs={editURL.urlArgs}
                    queryArgs={editURL.queryArgs}
                  >
                    edit
                  </InternalLink>
                ) : undefined,
              ]}
            />
          }
        />
        <Modal
          title="Cell numeric details"
          open={showCell !== undefined}
          onCancel={() => setShowCell(undefined)}
          onOk={() => setShowCell(undefined)}
          footer={null}
          className={classes.cellModal}
        >
          {showCell !== undefined ? (
            <NumericCellDetails
              cell={table.getCell(showCell[0], showCell[1])}
              renderRecordId={renderRecordId}
              removeRecord={
                removeRecord !== undefined
                  ? (recordId: number) => {
                      const hasOnlyOneCell =
                        table.getCell(showCell[0], showCell[1]).data.ids
                          .length === 1;
                      return removeRecord(recordId).then(() => {
                        if (hasOnlyOneCell) {
                          setShowCell(undefined);
                        }
                      });
                    }
                  : undefined
              }
            />
          ) : undefined}
        </Modal>
      </div>
    );
  }
);

function onCellClick(
  cell: Cell,
  table: AutoTable,
  autoTableRenderConfig: AutoTableRenderConfig,
  setShowCell: (cell: [number, number] | undefined) => void
) {
  // click on a row to highlight its value
  if (
    !cell.th &&
    cell.row >= table.valueHeaderHeight &&
    cell.col < table.attrHeaderWidth
  ) {
    if (
      typeof autoTableRenderConfig.highlight === "object" &&
      autoTableRenderConfig.highlight.value === cell.row
    ) {
      autoTableRenderConfig.highlight = "none";
    } else {
      autoTableRenderConfig.highlight = { type: "row", value: cell.row };
    }
    return;
  }

  if (table.isLeafValueHeaderCell(cell)) {
    // click on a value header to search for it.
    autoTableRenderConfig.toggleSortColumn(cell.col);
    return;
  }

  if (
    !cell.th &&
    cell.row >= table.valueHeaderHeight &&
    cell.col >= table.attrHeaderWidth
  ) {
    setShowCell([cell.row, cell.col]);
    return;
  }
}
