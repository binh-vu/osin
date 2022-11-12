import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  ColumnHeightOutlined,
  DeleteColumnOutlined,
  DeleteOutlined,
  ReloadOutlined,
  RestOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { makeStyles } from "@mui/styles";
import { Button, Dropdown, Modal, Space } from "antd";
import { useState } from "react";
import { FilterForm, FilterFormProps } from "../FilterForm";
import { TableColumnManagement } from "./ColumnManagement";
import { ColumnConfig } from "./Columns";
import { TableComponentFunc } from "./TableComponent";

const useStyles = makeStyles({
  root: {
    margin: 8,
    "& .ant-btn > .anticon + span": {
      marginLeft: 4,
    },
  },
  manageColumns: {
    maxWidth: 1024,
    minWidth: 680,
    width: "70vw",
    "& .ant-modal-header": {
      padding: "8px 16px",
    },
    "& .ant-modal-body": {
      padding: 0,
    },
    "& .ant-modal-close-x": {
      width: 38,
      height: 38,
      lineHeight: "38px",
    },
  },
});

export const TableToolbar = <R,>({
  table,
  selectedRowKeys,
  setSelectedRowKeys,
  filter = false,
  filterArgs,
}: {
  table: TableComponentFunc<R>;
  filter?: boolean;
  filterArgs?: FilterFormProps<R>;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  saveColumnState?: (cfgs: ColumnConfig[]) => void;
}) => {
  const classes = useStyles();
  const [showColumnModal, setShowColumnModal] = useState(false);

  const selectedActions = [];
  if (
    selectedRowKeys.length > 0 &&
    table.isDeleted !== undefined &&
    table.removeRecords !== undefined &&
    table.restoreRecords !== undefined
  ) {
    const isDeleted = table.isDeleted;
    const removeRecords = table.removeRecords;
    const restoreRecords = table.restoreRecords;

    const records = table.getRecordsByIds(selectedRowKeys as (keyof R)[]);
    const nDeleted = records
      .map((r) => (isDeleted(r) ? 1 : 0) as number)
      .reduce((a, b) => a + b, 0);

    if (nDeleted <= selectedRowKeys.length) {
      selectedActions.push(
        <Button
          key="remove"
          type="text"
          size="middle"
          onClick={() => {
            removeRecords(records).then(() => {
              setSelectedRowKeys([]);
            });
          }}
        >
          <DeleteOutlined />
          Remove
        </Button>
      );
    }

    if (nDeleted > 0) {
      selectedActions.push(
        <Button
          key="restore"
          type="text"
          size="middle"
          onClick={() => {
            restoreRecords(records).then(() => {
              setSelectedRowKeys([]);
            });
          }}
        >
          <RestOutlined />
          Restore
        </Button>
      );
    }

    // : (rids: (keyof R)[]) => {
    //   if (restoreRecords === undefined) {
    //     return Promise.resolve();
    //   }
    //   let id2records = Object.fromEntries(data.map((r) => [r[rowKey], r]));
    //   return restoreRecords(rids.map((rid) => id2records[rid]));
    // },
  }

  return (
    <div className={classes.root}>
      {filter ? (
        <FilterForm {...filterArgs} style={{ marginBottom: 8 }} />
      ) : null}
      <Space direction="horizontal" size={4}>
        <Button
          type="primary"
          ghost={true}
          size="middle"
          onClick={(e) => {
            setShowColumnModal(true);
          }}
        >
          <DeleteColumnOutlined /> Manage Columns
        </Button>
        <Dropdown
          menu={{
            items: [
              { key: "small", label: "Small" },
              { key: "middle", label: "Middle" },
              { key: "large", label: "Large" },
            ],
            selectedKeys: [table.currentTableSize()],
            onClick: ({ key }) => {
              table.changeTableSize(
                key as unknown as "small" | "middle" | "large"
              );
            },
          }}
        >
          <Button type="text" size="middle">
            <ColumnHeightOutlined />
            Row Height
          </Button>
        </Dropdown>
        <Button type="text" size="middle" onClick={table.reload}>
          <ReloadOutlined />
          Reload
        </Button>
        {selectedActions}
      </Space>
      <Modal
        title={"Manage Columns"}
        className={classes.manageColumns}
        style={{
          top: 20,
          position: "absolute",
          left: 20,
          width: "70vw",
        }}
        width={"70vw"}
        open={showColumnModal}
        onCancel={() => setShowColumnModal(false)}
        onOk={() => setShowColumnModal(true)}
        footer={
          <Space direction="horizontal" size={8}>
            <Button
              type="primary"
              ghost={true}
              danger={true}
              size="middle"
              onClick={() => table.resetInternalColumns(false)}
            >
              <UndoOutlined />
              Reset
            </Button>
            <Button
              type="primary"
              ghost={true}
              size="middle"
              onClick={() => table.resetInternalColumns(true)}
            >
              <CloudDownloadOutlined />
              Restore
            </Button>
            <Button
              type="primary"
              size="middle"
              onClick={table.saveInternalColumns}
            >
              <CloudUploadOutlined /> Save
            </Button>
          </Space>
        }
      >
        <TableColumnManagement
          internalColumns={table.internalColumns()}
          setInternalColumns={table.setInternalColumns}
        />
      </Modal>
    </div>
  );
};
