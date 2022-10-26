import { makeStyles } from "@mui/styles";
import { Col, Input, Row, Space } from "antd";
import Tree, { DataNode, TreeProps } from "antd/lib/tree";
import { useMemo, useState } from "react";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  PushpinOutlined,
  PushpinFilled,
} from "@ant-design/icons";
import { SearchOutlined } from "@ant-design/icons";
import { TableColumn, TableColumnIndex } from "./Columns";
export const useStyles = makeStyles({
  root: {
    "& .ant-tree-treenode": {
      width: "100%",
      border: "1px solid #ccc",
      borderRadius: 4,
      marginBottom: 4,
      // override their 4px padding bottom which looks non-symmetric
      padding: "2px 0 !important",
    },
    "& .ant-tree-draggable-icon": {
      opacity: "1 !important",
      order: 1,
    },
    "& .ant-col": {
      borderRight: "1px solid #f0f0f0",
    },
    "& .ant-col:last-child": {
      borderRight: "none",
    },
  },
  header: {
    borderBottom: "1px solid #f0f0f0",
    height: 34,
    "& .ant-input-affix-wrapper": {
      border: "none",
    },
    "& .ant-col": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  },
  content: {
    "& .ant-col": {
      padding: 8,
    },
  },
  treeItem: {
    display: "flex",
    justifyContent: "space-between",
  },
});

export const TableColumnManagement = <R,>({
  internalColumns,
  setInternalColumns,
}: {
  internalColumns: TableColumnIndex<R>;
  setInternalColumns: (columns: TableColumnIndex<R>) => void;
}) => {
  const classes = useStyles();
  const [query, setQuery] = useState("");

  const replaceColumn = (key: React.Key, newprops: Partial<TableColumn<R>>) => {
    setInternalColumns(
      internalColumns.updateColumn({
        ...internalColumns.getColumn(key),
        ...newprops,
      })
    );
  };

  const onDrop: TreeProps["onDrop"] = (info) => {
    setInternalColumns(
      internalColumns.moveafter(info.dragNode.key, info.node.key)
    );
  };

  const onPinned = (key: React.Key, pin: "left" | "right" | undefined) => {
    setInternalColumns(internalColumns.pinColumn(key, pin));
  };

  const [treeData, pinnedLeftTreeData, pinnedRightTreeData] = useMemo(() => {
    const mapfn = (
      key: React.Key,
      pinned?: "left" | "right"
    ): DataNode | undefined => {
      let col = internalColumns.getColumn(key);

      if (pinned === "left" && col.fixed !== "left") {
        return undefined;
      } else if (pinned === "right" && col.fixed !== "right") {
        return undefined;
      }

      let title;
      if ((col.title as React.ReactElement).type === "abbr") {
        title = (col.title as React.ReactElement).props.title;
      } else {
        title = col.title;
      }

      let visibleControl = null;
      if (pinned === undefined) {
        visibleControl =
          col.visible === false ? (
            <EyeInvisibleOutlined
              onClick={() => replaceColumn(col.key, { visible: true })}
            />
          ) : (
            <EyeOutlined
              onClick={() => replaceColumn(col.key, { visible: false })}
            />
          );
      }

      let pinnedLeftControl = null;
      if (pinned !== "right") {
        pinnedLeftControl = (
          <span>
            {pinned === undefined ? "L" : null}
            {col.fixed === "left" ? (
              <PushpinFilled onClick={() => onPinned(col.key, undefined)} />
            ) : (
              <PushpinOutlined onClick={() => onPinned(col.key, "left")} />
            )}
          </span>
        );
      }

      let pinnedRightControl = null;
      if (pinned !== "left") {
        pinnedRightControl = (
          <span>
            {pinned === undefined ? "R" : null}
            {col.fixed === "right" ? (
              <PushpinFilled onClick={() => onPinned(col.key, undefined)} />
            ) : (
              <PushpinOutlined onClick={() => onPinned(col.key, "right")} />
            )}
          </span>
        );
      }

      return {
        title: (
          <div className={classes.treeItem}>
            {title}
            <Space size={8}>
              {pinnedLeftControl}
              {visibleControl}
              {pinnedRightControl}
            </Space>
          </div>
        ),
        key: col.key,
        children: internalColumns
          .getChildren(key)
          .map((key) => mapfn(key, pinned))
          .filter((item) => item !== undefined) as DataNode[],
      };
    };

    const all = internalColumns
      .getTopColumns()
      .map((key) => mapfn(key, undefined))
      .filter((item) => item !== undefined) as DataNode[];
    const pinnedLeft = internalColumns
      .getTopColumns()
      .map((key) => mapfn(key, "left"))
      .filter((item) => item !== undefined) as DataNode[];
    const pinnedRight = internalColumns
      .getTopColumns()
      .map((key) => mapfn(key, "right"))
      .filter((item) => item !== undefined) as DataNode[];

    return [all, pinnedLeft, pinnedRight];
  }, [internalColumns, query]);

  return (
    <div className={classes.root}>
      <Row className={classes.header}>
        <Col span={6}>Pinned to the left</Col>
        <Col span={12}>
          <Input
            placeholder="Search"
            onChange={(e) => setQuery(e.target.value)}
            prefix={<SearchOutlined />}
          />
        </Col>
        <Col span={6}>Pinned to the right</Col>
      </Row>
      <Row className={classes.content}>
        <Col span={6}>
          <Tree
            showIcon={true}
            blockNode={true}
            draggable={true}
            selectable={false}
            treeData={pinnedLeftTreeData}
            defaultExpandAll={true}
            autoExpandParent={true}
            onDrop={onDrop}
          />
        </Col>
        <Col span={12}>
          <Tree
            showIcon={true}
            blockNode={true}
            draggable={true}
            selectable={false}
            treeData={treeData}
            defaultExpandAll={false}
            autoExpandParent={false}
            onDrop={onDrop}
          />
        </Col>
        <Col span={6}>
          <Tree
            showIcon={true}
            blockNode={true}
            draggable={true}
            selectable={false}
            treeData={pinnedRightTreeData}
            defaultExpandAll={true}
            autoExpandParent={true}
            onDrop={onDrop}
          />
        </Col>
      </Row>
    </div>
  );
};
