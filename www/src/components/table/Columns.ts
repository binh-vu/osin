import { ColumnType } from "antd/lib/table";
import { arrayFindLastIndex, arrayRemove, arrayReverse } from "misc";
import React from "react";

export interface ColumnWidth {
  // width that is tried to set automatically by algorithm in our table component, not the initial width that
  // the component that uses this component sets
  auto?: number;
  // width that the users set in the UI
  user?: number;
}

export interface TableColumn<R> extends Omit<ColumnType<R>, "key"> {
  key: React.Key;
  originalKey?: React.Key;
  visible?: boolean;
  children?: TableColumn<R>[];
  fixed?: "left" | "right";
  moreWidth?: ColumnWidth;
}

export interface FlattenTableColumn<R>
  extends Omit<TableColumn<R>, "children"> {
  moreWidth: ColumnWidth;
}

export interface ColumnConfig {
  key: React.Key;
  children: ColumnConfig[];
  visible: boolean;
  pinned: "left" | "right" | undefined;
}

function dfs<R>(
  callback: (column: TableColumn<R>) => void,
  columns: TableColumn<R>[]
) {
  if (columns.length === 0) {
    return;
  }

  let stack: [number, TableColumn<R>[]][] = [[0, columns]];
  let pointer = 0;

  while (pointer >= 0) {
    // visit this node and move to the next node
    let col = stack[pointer][1][stack[pointer][0]]!;
    callback(col);
    stack[pointer][0]++;

    if (stack[pointer][0] >= stack[pointer][1].length) {
      // the current level is finished, pop it
      stack.pop();
      pointer--;
    }

    if (col.children !== undefined && col.children.length > 0) {
      stack.push([0, col.children]);
      pointer++;
    }
  }
}

export class TableColumnIndex<R> {
  protected static ROOT_ID = "__root__";

  // the first item of columns is always a dummy root node so this is always a tree.
  // the order of flattenColumns matches the order of the displaying
  protected readonly flattenColumns: FlattenTableColumn<R>[];
  protected readonly key2index: { [key: string]: number };
  // mapping from column index to its parent index
  protected readonly key2parent: { [key: string]: React.Key };
  protected readonly key2children: { [key: string]: React.Key[] };

  private constructor(
    columns: FlattenTableColumn<R>[],
    key2column: { [key: string]: number },
    key2parent: { [key: string]: React.Key },
    key2children: { [key: string]: React.Key[] }
  ) {
    this.flattenColumns = columns;
    this.key2index = key2column;
    this.key2parent = key2parent;
    this.key2children = key2children;
  }

  static fromNestedColumns<R>(columns: TableColumn<R>[]): TableColumnIndex<R> {
    let root_id = TableColumnIndex.ROOT_ID;
    let flattenColumns: FlattenTableColumn<R>[] = [
      {
        key: root_id,
        moreWidth: {},
      },
    ];
    let key2column: { [key: string]: number } = {
      [root_id]: 0,
    };
    let key2children: { [key: string]: React.Key[] } = {
      [root_id]: columns.map((col) => col.key),
    };
    let key2parent: { [key: string]: React.Key } = Object.fromEntries(
      columns.map((c) => [c.key, root_id])
    );

    dfs((col) => {
      if (key2column[col.key] !== undefined) {
        throw new Error(`Duplicate column key: ${col.key}`);
      }
      key2column[col.key] = flattenColumns.length;
      // let flattenColumn: Omit<TableColumn<R>, "children">
      let { children: _children, ...flattenColumn } = col;
      if (flattenColumn.moreWidth === undefined) {
        flattenColumn.moreWidth = {} as ColumnWidth;
      }
      flattenColumns.push(flattenColumn as FlattenTableColumn<R>);

      if (col.children !== undefined) {
        key2children[col.key] = col.children.map((el) => el.key);
        for (let child of col.children) {
          key2parent[child.key] = col.key;
        }
      } else {
        key2children[col.key] = [];
      }
    }, columns);

    return new TableColumnIndex(
      flattenColumns,
      key2column,
      key2parent,
      key2children
    );
  }

  /**
   * Get the current configuration so we can restore it later.
   */
  getChanges(key: React.Key = TableColumnIndex.ROOT_ID): ColumnConfig[] {
    return this.key2children[key].map((child) => {
      let col = this.flattenColumns[this.key2index[child]];
      return {
        key: col.originalKey || col.key,
        visible: col.visible !== false,
        pinned: col.fixed,
        children: this.getChanges(child),
      };
    });
  }

  /**
   * Restore the configuration from the serialized data.
   */
  restoreChanges(cfgs: ColumnConfig[]): TableColumnIndex<R> {
    return this.shallowclone().restore_(
      TableColumnIndex.ROOT_ID,
      cfgs,
      TableColumnIndex.ROOT_ID
    );
  }

  dfs(
    callback: (key: React.Key) => void,
    root: React.Key = TableColumnIndex.ROOT_ID
  ): void {
    let stack: React.Key[] = arrayReverse(this.key2children[root]);
    while (stack.length > 0) {
      let key = stack.pop()!;
      callback(key);
      let children = this.key2children[key];
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }

  /** Return the level of the column tree */
  getTreeHeight(): number {
    const fn = (key: React.Key, depth: number): number => {
      const children = this.key2children[key];
      if (children.length === 0) {
        return depth;
      }
      return Math.max(...children.map((child) => fn(child, depth + 1)));
    };
    return fn(TableColumnIndex.ROOT_ID, 0);
  }

  shallowclone() {
    return new TableColumnIndex(
      Array.from(this.flattenColumns),
      Object.assign({}, this.key2index),
      Object.assign({}, this.key2parent),
      Object.assign({}, this.key2children)
    );
  }

  getTopColumns(): React.Key[] {
    return this.key2children[TableColumnIndex.ROOT_ID];
  }

  getColumn(key: React.Key): FlattenTableColumn<R> {
    return this.flattenColumns[this.key2index[key]];
  }

  getLeafColumns(): FlattenTableColumn<R>[] {
    return this.flattenColumns.filter(
      (col) => this.key2children[col.key].length === 0
    );
  }

  getChildren(key: React.Key): React.Key[] {
    return this.key2children[key];
  }

  getNumLeafColumns(): number {
    return this.flattenColumns
      .map((col): number => (this.key2children[col.key].length === 0 ? 1 : 0))
      .reduce((a, b) => a + b, 0);
  }

  getAntdColumns(
    numericWidthOnly: boolean = false,
    key: React.Key = TableColumnIndex.ROOT_ID
  ): TableColumn<R>[] {
    return this.key2children[key || TableColumnIndex.ROOT_ID]
      .filter(
        (key) => this.flattenColumns[this.key2index[key]].visible !== false
      )
      .map((key) => {
        let children = undefined;
        if (this.key2children[key].length > 0) {
          children = this.getAntdColumns(numericWidthOnly, key);
          if (children.length === 0) {
            children = undefined;
          }
        }

        const col = this.flattenColumns[this.key2index[key]];
        let width = col.width;
        if (numericWidthOnly && typeof width !== "number") {
          width = col.moreWidth.user || col.moreWidth.auto;
        }

        return Object.assign(
          {
            children,
          },
          this.flattenColumns[this.key2index[key]],
          { width }
        );
      });
  }

  updateColumn(column: FlattenTableColumn<R>): TableColumnIndex<R> {
    let columns = Array.from(this.flattenColumns);
    columns[this.key2index[column.key]] = column;
    return new TableColumnIndex(
      columns,
      this.key2index,
      this.key2parent,
      this.key2children
    );
  }

  hasNumberedWidth(): boolean {
    return this.flattenColumns.every(
      (col) =>
        col.key === TableColumnIndex.ROOT_ID ||
        typeof col.width === "number" ||
        col.moreWidth.user !== undefined ||
        col.moreWidth.auto !== undefined
    );
  }

  /**
   * Sync our column width from another TableColumnIndex.
   *
   * @param that the other TableColumnIndex that we want to copy width from.
   */
  syncColumnAutoWidth(that: TableColumnIndex<R>): TableColumnIndex<R> {
    const columns = Array.from(this.flattenColumns);

    for (let key of Object.keys(that.key2index)) {
      if (this.key2index[key] !== undefined) {
        const thiscol = columns[this.key2index[key]];
        const thatcol = that.flattenColumns[that.key2index[key]];
        columns[this.key2index[key]] = Object.assign({}, thiscol, {
          moreWidth: {
            auto: thatcol.moreWidth.auto,
            user: thiscol.moreWidth.user,
          },
        });
      }
    }

    return new TableColumnIndex(
      columns,
      this.key2index,
      this.key2parent,
      this.key2children
    );
  }

  /**
   * Set the auto width properties of columns to a fixed width
   */
  setColumnAutoWidth(
    width: number | ((column: FlattenTableColumn<R>) => number)
  ): TableColumnIndex<R> {
    let columns = this.flattenColumns.map((col) => {
      if (this.key2children[col.key].length === 0) {
        // leaf node
        return Object.assign({}, col, {
          moreWidth: {
            ...col.moreWidth,
            auto: typeof width === "number" ? width : width(col),
          },
        });
      }
      return Object.assign({}, col);
    });

    const setWidth = (col: FlattenTableColumn<R>): number => {
      if (col.moreWidth.auto !== undefined) {
        return col.moreWidth.auto;
      }
      col.moreWidth.auto = this.key2children[col.key]
        .map((key) => setWidth(columns[this.key2index[key]]))
        .reduce((a, b) => a + b, 0);
      return col.moreWidth.auto;
    };

    this.key2children[TableColumnIndex.ROOT_ID].forEach((key) => {
      setWidth(columns[this.key2index[key]]);
    });

    const newindex = new TableColumnIndex(
      columns,
      this.key2index,
      this.key2parent,
      this.key2children
    );

    if (!newindex.hasNumberedWidth()) {
      throw new Error("Failed to set missing column width");
    }

    return newindex;
  }

  /**
   * Pin a column in the table, maintaining their original relative order.
   * See more: `this.pinColumn_`
   *
   * @param key
   * @param fixed
   */
  pinColumn(
    key: React.Key,
    pin: "left" | "right" | undefined
  ): TableColumnIndex<R> {
    return this.shallowclone().pinColumn_(key, pin).merge_();
  }

  /**
   * Move a column after another column. See more at `this.moveafter_`
   *
   * @param c1key
   * @param c2key
   * @returns
   */
  moveafter(c1key: React.Key, c2key: React.Key): TableColumnIndex<R> {
    return this.shallowclone().moveafter_(c1key, c2key).merge_();
  }

  /**
   * Restore the changes from the serialized data. This function must be called
   * the first time after `TableColumnIndex.fromNestedColumns`.
   *
   * @param root the parent node
   * @param cfgs children configuration
   * @param newroot the new parent node that this node is mapped to
   * @returns
   */
  protected restore_(
    root: React.Key,
    cfgs: ColumnConfig[],
    newroot: React.Key
  ): TableColumnIndex<R> {
    let children = new Set(this.key2children[root]);
    let newchildren = [];
    let key_counts: { [key: React.Key]: number } = Object.fromEntries(
      Array.from(children).map((k) => [k, 0])
    );
    let key_visits: { [key: React.Key]: number } = Object.assign(
      {},
      key_counts
    );

    // check if the configuration is compatible
    for (let cfg of cfgs) {
      if (!children.has(cfg.key)) {
        throw new Error(
          `Invalid column key: ${cfg.key}. The configuration is not compatible with the table columns.`
        );
      }
      key_counts[cfg.key]++;
    }

    // populate new children
    for (let cfg of cfgs) {
      let child = Object.assign(this.flattenColumns[this.key2index[cfg.key]], {
        visible: cfg.visible,
        fixed: cfg.pinned,
      });
      if (key_counts[cfg.key] === 1 || key_visits[cfg.key] === 0) {
        // no need new column, restore the configuration recursively
        newchildren.push(cfg.key);
        this.flattenColumns[this.key2index[cfg.key]] = child;
        this.restore_(cfg.key, cfg.children, cfg.key);
      } else {
        // multiple columns with this key, and we already visit it before
        // create a new column and restore the configuration recursively
        child.originalKey = cfg.key;
        child.key = `${cfg.key}:${key_visits[cfg.key]}`;

        newchildren.push(child.key);
        this.key2index[child.key] = this.flattenColumns.length;
        this.flattenColumns.push(child);
        this.key2parent[child.key] = newroot;

        this.restore_(cfg.key, cfg.children, child.key);
      }

      key_visits[cfg.key]++;
    }

    this.key2children[newroot] = newchildren;
    return this;
  }

  protected movetop_(key: React.Key) {
    if (this.key2index[key] === undefined || key === TableColumnIndex.ROOT_ID) {
      throw new Error(
        `Cannot move column ${key} to the top as we cannot find them`
      );
    }

    let root: React.Key = TableColumnIndex.ROOT_ID;

    // since the moving operator preserves column's hierarchy,
    // moving a linear nested column is the same as moving a leaf column
    // so we update key to be the top of the linear nested column
    while (
      this.key2parent[key] !== root &&
      this.key2children[this.key2parent[key]].length === 1
    ) {
      key = this.key2parent[key];
    }

    // duplicate the parent of key to preserve the hierarchy
    let newkeys = [];
    let copykey = this.key2parent[key];
    while (copykey !== root) {
      let newnode = Object.assign(
        {},
        this.flattenColumns[this.key2index[copykey]]
      );
      if (newnode.originalKey === undefined) {
        newnode.originalKey = newnode.key;
      }
      newnode.key = `${newnode.key}:dup`;
      this.key2index[newnode.key] = this.flattenColumns.length;
      this.key2children[newnode.key] = [];
      this.flattenColumns.push(newnode);
      newkeys.push(newnode.key);
      copykey = this.key2parent[copykey];
    }
    newkeys.push(root);
    // console.log(521, { newkeys });
    for (let i = 0; i < newkeys.length - 1; i++) {
      this.key2children[newkeys[i + 1]].push(newkeys[i]);
      this.key2parent[newkeys[i]] = newkeys[i + 1];
    }

    // remove key from its original position and set it to
    // the new top of the column
    // if it is the top column, do nothing
    if (newkeys.length > 1) {
      arrayRemove(this.key2children[this.key2parent[key]], key);
      this.key2children[newkeys[0]] = [key];
      this.key2parent[key] = newkeys[0];
      key = newkeys[newkeys.length - 2];
    }

    arrayRemove(this.key2children[this.key2parent[key]], key);
    this.key2children[root].splice(0, 0, key);
    this.key2parent[key] = root;

    return this;
  }

  /**
   * Merging columns that share the same parents but now are segmented due to
   * moving/pinned operators. We only merge columns that are adjacent to each other.
   */
  protected merge_(
    key: React.Key = TableColumnIndex.ROOT_ID
  ): TableColumnIndex<R> {
    let children = this.key2children[key];

    if (children.length === 0) {
      return this;
    }

    let groups: [number, number][] = [];

    let i = 0;
    let ci = this.flattenColumns[this.key2index[children[i]]];
    let cikey = ci.originalKey || ci.key;

    while (i < children.length - 1) {
      let j = i + 1;
      let cj = this.flattenColumns[this.key2index[children[j]]];
      let cjkey = cj.originalKey || cj.key;

      while (cikey === cjkey) {
        j++;
        cj = this.flattenColumns[this.key2index[children[j]]];
        cjkey = cj.originalKey || cj.key;
      }

      if (j > i + 1) {
        // exclusive
        groups.push([i, j]);
      }

      i = j;
      ci = cj;
      cikey = cjkey;
    }

    if (groups.length > 0) {
      // console.log(
      //   245,
      //   JSON.parse(JSON.stringify(groups)),
      //   JSON.parse(JSON.stringify(children))
      // );
      for (let i = groups.length - 1; i >= 0; i--) {
        let [start, end] = groups[i];
        // and remap the grand children to the first column
        for (let j = start + 1; j < end; j++) {
          let grandChildren = this.key2children[children[j]];
          this.key2children[children[start]].push(...grandChildren);
          for (let grandchild of grandChildren) {
            this.key2parent[grandchild] = children[start];
          }
        }
        // remove the duplicated columns from the children
        children.splice(start + 1, end - start - 1);
      }
      // console.log(
      //   260,
      //   JSON.parse(JSON.stringify(groups)),
      //   JSON.parse(JSON.stringify(children))
      // );
    }

    for (let child of children) {
      if (this.key2children[child].length > 0) {
        this.merge_(child);
      }
    }

    return this;
  }

  /**
   * Pin a column in the table, maintaining their original relative order.
   *
   * For nested columns, the parent column will be automatically pinned and a copy of the parent will be created
   * so that antd table can render them correctly, otherwise the parent column will be the whole parent
   * column for the entire table.
   *
   * Similarly, when the parent column is pinned, all of its children will be pinned.
   *
   * @param key
   * @param fixed
   */
  protected pinColumn_(
    key: React.Key,
    pin: "left" | "right" | undefined
  ): TableColumnIndex<R> {
    let column = this.flattenColumns[this.key2index[key]];
    if (column.fixed === pin) return this;

    // gather the list of leaf columns
    let leafColumns: FlattenTableColumn<R>[] = [];
    this.dfs((k) => {
      if (this.key2children[k].length === 0) {
        leafColumns.push(this.flattenColumns[this.key2index[k]]);
      }
    });

    if (pin === "left") {
      let pinnedLeftIndex = leafColumns.findIndex(
        (col) => col.fixed !== "left"
      );

      // we need to move the pinned column to the rightmost pinned column
      if (pinnedLeftIndex <= 0) {
        this.movetop_(key);
      } else if (leafColumns[pinnedLeftIndex].key !== key) {
        this.moveafter_(key, leafColumns[pinnedLeftIndex - 1].key);
      }

      column.fixed = pin;
      this.get_ancestors(key).forEach((k) => {
        this.flattenColumns[this.key2index[k]].fixed = pin;
      });
      this.dfs((childkey) => {
        this.flattenColumns[this.key2index[childkey]].fixed = pin;
      }, key);
      return this;
    }

    if (pin === "right") {
      let pinnedRightIndex = arrayFindLastIndex(
        leafColumns,
        (col) => col.fixed !== "right",
        leafColumns.length - 1
      );

      if (leafColumns[pinnedRightIndex].key !== key) {
        this.moveafter_(key, leafColumns[pinnedRightIndex].key);
      }

      column.fixed = pin;
      this.get_ancestors(key).forEach((k) => {
        this.flattenColumns[this.key2index[k]].fixed = pin;
      });
      this.dfs((childkey) => {
        this.flattenColumns[this.key2index[childkey]].fixed = pin;
      }, key);

      return this;
    }

    if (column.fixed === "left") {
      // check whether we need to move the column to the rightmost pinned column
      let pinnedLeftIndex = leafColumns.findIndex(
        (col) => col.fixed !== "left"
      );
      // pinnedLeftIndex cannot be zero because there is at least one column
      pinnedLeftIndex =
        pinnedLeftIndex === -1 ? leafColumns.length : pinnedLeftIndex;
      // console.log(
      //   { key, pin, pinnedLeftIndex },
      //   leafColumns.map((col) => col.key)
      // );
      this.moveafter_(key, leafColumns[pinnedLeftIndex - 1].key);

      column.fixed = pin;
      this.get_ancestors(key).forEach((k) => {
        this.flattenColumns[this.key2index[k]].fixed = pin;
      });
      this.dfs((childkey) => {
        this.flattenColumns[this.key2index[childkey]].fixed = pin;
      }, key);
    }

    if (column.fixed === "right") {
      // check whether we need to move the column to the leftmost pinned column
      let pinnedRightIndex = arrayFindLastIndex(
        leafColumns,
        (col) => col.fixed !== "right",
        leafColumns.length - 1
      );
      this.moveafter_(key, leafColumns[pinnedRightIndex].key);

      column.fixed = pin;
      this.get_ancestors(key).forEach((k) => {
        this.flattenColumns[this.key2index[k]].fixed = pin;
      });
      this.dfs((childkey) => {
        this.flattenColumns[this.key2index[childkey]].fixed = pin;
      }, key);
    }

    return this;
  }

  /**
   * Move column c1key to the place after column c2key.
   *
   * If c1key is a nested column, then its parent trace will also be kept during the
   * move. If its parent also contains other columns, then it will be duplicated, otherwise
   * the whole column is moved.
   *
   * If c2key is a nested column and:
   *    1. is a leaf node, then it will split the tree containing c2key
   *       into two trees (the first one will containing c2key), and insert c1key between.
   *    2. not a leaf node and not root of the tree, then, c2key will be replaced
   *       by the most right leaf node of the previous sibling of c2key.
   *    3. is the root of the tree, then, c2key will be replaced by previous sibling of c2key.
   *
   * @param c1key
   * @param c2key
   */
  protected moveafter_(
    c1key: React.Key,
    c2key: React.Key
  ): TableColumnIndex<R> {
    if (
      this.key2index[c1key] === undefined ||
      this.key2index[c2key] === undefined ||
      c1key === TableColumnIndex.ROOT_ID ||
      c2key === TableColumnIndex.ROOT_ID
    ) {
      throw new Error(
        `Cannot swap columns: ${c1key} or ${c2key} as we cannot find them`
      );
    }

    let root: React.Key = TableColumnIndex.ROOT_ID;
    // console.log(350, { c1key, c2key, root });

    if (c1key === c2key) {
      return this;
    }

    let c2ancestors = this.get_ancestors(c2key, root);
    if (c2ancestors.indexOf(c1key) !== -1) {
      // moving a node into its descendants is not allowed
      return this;
    }

    let c1ancestors = this.get_ancestors(c1key, root);
    if (
      c1ancestors.length > 0 &&
      c2ancestors.length > 0 &&
      c1ancestors[c1ancestors.length - 1] ===
        c2ancestors[c2ancestors.length - 1]
    ) {
      // sharing the same ancestors, identify the most deep common ancestor
      let i = 1;
      while (
        c1ancestors.length - i - 1 >= 0 &&
        c2ancestors.length - i - 1 >= 0 &&
        c1ancestors[c1ancestors.length - i - 1] ===
          c2ancestors[c2ancestors.length - i - 1]
      ) {
        i += 1;
      }

      root = c1ancestors[c1ancestors.length - i];
    }

    // console.log(459, { c1key, c2key, root });

    if (this.key2children[c2key].length > 0) {
      // c2 is a nested non-leaf node, choose a new c2 as the most right leaf node of c2's previous sibling
      while (this.key2parent[c2key] !== root) {
        let parentkey = this.key2parent[c2key];

        if (this.key2children[parentkey][0] === c2key) {
          // c2 is the first child, so we have to go up one level
          c2key = parentkey;
        } else {
          // now pick the most right leaf node of c2's previous sibling
          let c2index = this.key2children[parentkey].findIndex(
            (k) => k === c2key
          );
          let ptr = this.key2children[parentkey][c2index - 1];
          while (this.key2children[ptr].length > 0) {
            ptr = this.key2children[ptr][this.key2children[ptr].length - 1];
          }
          return this.moveafter(c1key, ptr);
        }
      }

      // we have reached the root of the tree, so we have to choose the previous sibling of the root
      if (this.key2children[root][0] === c2key) {
        // move to the top
        return this.movetop_(c1key);
      } else {
        let c2index = this.key2children[root].findIndex((k) => k === c2key);
        return this.moveafter(c1key, this.key2children[root][c2index - 1]);
      }
    }

    // since the moving operator preserves column's hierarchy,
    // moving a linear nested column is the same as moving a leaf column
    // so we update c1key to be the top of the linear nested column
    while (
      this.key2parent[c1key] !== root &&
      this.key2children[this.key2parent[c1key]].length === 1
    ) {
      c1key = this.key2parent[c1key];
    }

    // duplicate the parent of c1key to preserve the hierarchy
    let newkeys = [];
    let copykey = this.key2parent[c1key];
    while (copykey !== root) {
      let newnode = Object.assign(
        {},
        this.flattenColumns[this.key2index[copykey]]
      );
      if (newnode.originalKey === undefined) {
        newnode.originalKey = newnode.key;
      }
      newnode.key = `${newnode.key}:dup`;
      this.key2index[newnode.key] = this.flattenColumns.length;
      this.key2children[newnode.key] = [];
      this.flattenColumns.push(newnode);
      newkeys.push(newnode.key);
      copykey = this.key2parent[copykey];
    }
    newkeys.push(root);
    // console.log(521, { newkeys });
    for (let i = 0; i < newkeys.length - 1; i++) {
      this.key2children[newkeys[i + 1]].push(newkeys[i]);
      this.key2parent[newkeys[i]] = newkeys[i + 1];
    }

    // remove c1key from its original position and set it to
    // the new top of the column
    // if it is the top column, do nothing
    if (newkeys.length > 1) {
      arrayRemove(this.key2children[this.key2parent[c1key]], c1key);
      this.key2children[newkeys[0]] = [c1key];
      this.key2parent[c1key] = newkeys[0];
      c1key = newkeys[newkeys.length - 2];
    }
    // console.log(469, {
    //   c1key,
    //   c2key,
    //   root,
    //   tree: JSON.parse(JSON.stringify(this.key2children)),
    // });

    // split the tree containing c2key into two trees if possible
    this.split_(c2key, root);
    // console.log(477, {
    //   c1key,
    //   c2key,
    //   tree: JSON.parse(JSON.stringify(this.key2children)),
    // });

    c2key = this.get_top_column_of(c2key, root);

    // if c1key is fixedLeft, it can only be fixedLeft if c2key is fixedLeft
    let c1 = this.flattenColumns[this.key2index[c1key]];
    if (c1.fixed === "left") {
      let c2 = this.flattenColumns[this.key2index[c2key]];
      if (c2.fixed !== "left") {
        c1.fixed = undefined;
      }
    } else {
      // TODO: handle fixed right
      c1.fixed = undefined;
    }

    // console.log(777, {c1key,c2key,tree: JSON.parse(JSON.stringify(this.key2children)),    });

    // insert c1key after c2key
    let c2parentkey = this.key2parent[c2key];
    arrayRemove(this.key2children[this.key2parent[c1key]], c1key);
    let insertPos = this.key2children[c2parentkey].indexOf(c2key);
    // console.log(792,JSON.parse(JSON.stringify(this.key2children[c2parentkey]))    );
    this.key2children[c2parentkey].splice(insertPos + 1, 0, c1key);
    // console.log(      794,JSON.parse(JSON.stringify(this.key2children[c2parentkey]))    );
    this.key2parent[c1key] = c2parentkey;

    // console.log(504, {
    //   c1key,
    //   c2key,
    //   root,
    //   tree: JSON.parse(JSON.stringify(this.key2children)),
    // });
    return this;
  }

  /**
   * Split a subtree into two subtrees, the first subtree contains all the nodes before the node with the key
   * and the second subtree contains all the nodes after the node with the key.
   *
   * Note: key must be a leaf node.
   *
   * Example: (A) is a dummy root node
   *
   *               (A)
   *              /   \
   *           (B)   (C)
   *         /   \     \
   *      (D)   (E)   (F)
   *    /   \     \
   *  (G)   (H)   (I)
   *
   * Split at (H) will return two subtrees:
   *
   *                (A)
   *             /   |  \
   *           (B)  (B)  (C)
   *          /       \     \
   *        (D)       (E)   (F)
   *       /   \        \
   *    (G)   (H)       (I)
   *
   * Split at (G) will return two subtrees:
   *
   *                (A)
   *             /   |  \
   *           (B)  (B)  (C)
   *          /    /  \     \
   *        (D)  (D)  (E)   (F)
   *       /      |     \
   *    (G)      (H)    (I)
   *
   * How the algorithm works:
   *
   * Consider a parent node of a splitted key, we observed that it will be splitted into two trees when
   * there are at least one right sibiling of the splitted key. Otherwise, it will be only one tree and we
   * do not need to split it.
   * Also, if a node is splitted, then its parent will also be splitted.
   *
   * The two above observations form the basis of the algorithm.
   *
   * @param key
   * @param fixRoot
   */
  protected split_(
    key: React.Key,
    fixRoot: React.Key = TableColumnIndex.ROOT_ID
  ) {
    let parentkey = this.key2parent[key];
    let childidx = this.key2children[parentkey].indexOf(key);

    // determine a node at which we can split into two trees
    while (
      childidx === this.key2children[parentkey].length - 1 &&
      parentkey !== fixRoot
    ) {
      // cannot split this tree, so we recurse the problem
      key = parentkey;
      parentkey = this.key2parent[key];
      childidx = this.key2children[parentkey].indexOf(key);
    }

    // when the split key is the direct child of the root node, we do not need to split.
    if (parentkey === fixRoot) {
      return;
    }

    // the tree is splittable, so we split it here.
    let newparent = Object.assign(
      {},
      this.flattenColumns[this.key2index[parentkey]]
    );
    if (newparent.originalKey === undefined) {
      newparent.originalKey = newparent.key;
    }
    newparent.key = `${newparent.key}:dup`;

    // add new parent to the tree, but we do not update the parent of the new parent yet
    // because we don't know it yet, update it later when we propagate the splitting
    this.key2index[newparent.key] = this.flattenColumns.length;
    this.flattenColumns.push(newparent);

    // move right sibilings to the new parent
    this.key2children[newparent.key] = this.key2children[parentkey].slice(
      childidx + 1
    );
    for (let child of this.key2children[newparent.key]) {
      this.key2parent[child] = newparent.key;
    }
    // and update children of the parent to contain only the left sibilings and the split node's parent
    this.key2children[parentkey] = this.key2children[parentkey].slice(
      0,
      childidx + 1
    );

    // as this node is splitted, we propagate to its parent until we hit the fixRoot node
    // at which we stop the splitting
    while (this.key2parent[parentkey] !== fixRoot) {
      let grandparentkey = this.key2parent[parentkey];
      let newgrandparent = Object.assign(
        {},
        this.flattenColumns[this.key2index[grandparentkey]]
      );
      if (newgrandparent.originalKey === undefined) {
        newgrandparent.originalKey = newgrandparent.key;
      }
      newgrandparent.key = `${newgrandparent.key}:dup`;

      // add new grandparent to the tree
      this.key2index[newgrandparent.key] = this.flattenColumns.length;
      this.flattenColumns.push(newgrandparent);
      // set children of the new grandparent to contain only the split node and its right siblings
      let splitidx = this.key2children[grandparentkey].indexOf(parentkey);
      this.key2children[newgrandparent.key] = this.key2children[grandparentkey]
        .slice(splitidx)
        .map((child) => (child === parentkey ? newparent.key : child));
      for (let item of this.key2children[newgrandparent.key]) {
        this.key2parent[item] = newgrandparent.key;
      }
      // update the children of the old grandparent to contain only the left sibilings and **the split node**
      this.key2children[grandparentkey] = this.key2children[
        grandparentkey
      ].slice(0, splitidx + 1);

      newparent = newgrandparent;
      parentkey = grandparentkey;
    }

    if (this.key2parent[parentkey] === fixRoot) {
      // the split stop here, so we update the parent of the new parent
      this.key2parent[newparent.key] = fixRoot;
      this.key2children[fixRoot].splice(
        this.key2children[fixRoot].indexOf(parentkey) + 1,
        0,
        newparent.key
      );
    }
  }

  protected remove_(key: React.Key): FlattenTableColumn<R> {
    let idx = this.key2index[key];
    let col = this.flattenColumns.splice(idx, 1)[0];

    let siblings = this.key2children[this.key2parent[key]];
    siblings.splice(
      siblings.findIndex((k) => k === key),
      1
    );

    return col;
  }

  /**
   * Get the top column of a column identified by a key.
   *
   * @param key
   * @returns
   */
  protected get_top_column_of(
    key: React.Key,
    root: React.Key = TableColumnIndex.ROOT_ID
  ): React.Key {
    let parentkey = this.key2parent[key];
    while (parentkey !== root) {
      key = parentkey;
      parentkey = this.key2parent[key];
    }
    return parentkey === root ? key : parentkey;
  }

  protected get_ancestors(
    key: React.Key,
    root: React.Key = TableColumnIndex.ROOT_ID
  ): React.Key[] {
    let ancestors = [];
    while (this.key2parent[key] !== root) {
      key = this.key2parent[key];
      ancestors.push(key);
    }
    return ancestors;
  }
}

export function getRecordValue<R extends object>(
  record: R,
  column: TableColumn<R>
) {
  if (
    Array.isArray(column.dataIndex) ||
    (typeof column.dataIndex === "string" &&
      column.dataIndex.indexOf(".") !== -1)
  ) {
    let parts: (string | number)[] = Array.isArray(column.dataIndex)
      ? column.dataIndex
      : column.dataIndex.split(".");
    let value = record;
    for (let part of parts) {
      value = (value as any)[part];
      if (value === undefined) {
        return undefined;
      }
    }
    return value;
  }
  if (
    typeof column.dataIndex === "number" ||
    (typeof column.dataIndex === "string" &&
      column.dataIndex.indexOf(".") === -1)
  ) {
    return (record as any)[column.dataIndex];
  }
  return undefined;
}

export class TableColumnMeasurement {
  protected headerMeasureCtx: CanvasRenderingContext2D;
  protected cellMeasureCtx: CanvasRenderingContext2D;

  constructor(headerFont: string, cellFont: string) {
    const canvas = document.createElement("canvas");
    this.headerMeasureCtx = canvas.getContext("2d")!;
    this.headerMeasureCtx.font = headerFont;

    const canvas2 = document.createElement("canvas");
    this.cellMeasureCtx = canvas2.getContext("2d")!;
    this.cellMeasureCtx.font = cellFont;
  }

  measureHeaderTextWidth = (text: string): number => {
    return this.headerMeasureCtx.measureText(text).width;
  };

  measureCellTextWidth = (text: string): number => {
    return this.cellMeasureCtx.measureText(text).width;
  };

  measureColumnWidths(headers: string[], columns: string[][]): number[] {
    let columnWidths = headers.map(this.measureHeaderTextWidth);
    for (let i = 0; i < columns.length; i++) {
      columnWidths[i] = Math.max(
        columnWidths[i],
        ...columns[i].map(this.measureCellTextWidth)
      );
    }
    return columnWidths;
  }

  /**
   * Return the computed CSS `font` property value for an element.
   */
  static getCssFont = (container: Element) => {
    const style = getComputedStyle(container);
    const { fontStyle, fontVariant, fontWeight, fontSize, fontFamily } = style;
    return {
      font: `${fontStyle!} ${fontVariant!} ${fontWeight!} ${fontSize!} ${fontFamily}`,
      fontSize: parseFloat(fontSize),
      fontFamily,
    };
  };
}
