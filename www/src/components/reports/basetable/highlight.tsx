import _ from "lodash";
import { BaseCell, BaseData } from "./BaseCell";
import { BaseTable } from "./BaseTable";

import { blue, green, red } from "@ant-design/colors";
import { makeStyles } from "@mui/styles";
import Rainbow from "rainbowvis.js";
import React from "react";
export type HighlightMode =
  | "none"
  | "row"
  | "col"
  | "row-best"
  | "col-best"
  | { type: "row"; value: number }
  | { type: "col"; value: number };

/**
 * Highlight numeric values in the table to make it easier
 * to see numeric values. Must apply before applying operators that break the table's structure
 */
export function highlight<
  T extends BaseTable<C, D>,
  C extends BaseCell<D>,
  D extends BaseData
>(
  table: T,
  mode: HighlightMode,
  range: {
    rowstart?: number;
    rowend?: number;
    rowstep?: number;
    colstart?: number;
    colend?: number;
    colstep?: number;
  }
) {
  if (mode === "none") return table;

  const groupMode =
    mode === "row" ||
    mode === "row-best" ||
    (typeof mode !== "string" && mode.type === "col")
      ? "row"
      : "col";
  let groups: C[][] | { group: C[]; pivot: C }[] = table.grouping(
    groupMode,
    range
  );

  if (groups.length === 0) return table;

  const rainbow = new Rainbow();
  rainbow.setSpectrum("#b7eb8f", "#237804");
  rainbow.setNumberRange(0, 1000);

  if (typeof mode !== "string") {
    const kprime =
      mode.type === "col"
        ? (mode.value - (range.colstart || 0)) / (range.colstep || 1)
        : (mode.value - (range.rowstart || 0)) / (range.rowstep || 1);
    groups = groups.map((group) => ({
      group,
      pivot: group[kprime],
    }));
  }

  const isHighlightTheBest = typeof mode === "string" && mode.endsWith("-best");

  for (const group of groups) {
    const cells = Array.isArray(group) ? group : group.group;
    const pivot = Array.isArray(group) ? undefined : group.pivot;
    const pivotData =
      pivot !== undefined ? pivot.data.getNumericData() : undefined;

    const highlightCells = cells.filter(
      (cell) => cell.data.getNumericData() !== undefined
    );
    const values = highlightCells.map(
      (cell) => cell.data.getNumericData()!.mean
    );

    let min = _.min(values)!;
    let max = _.max(values)!;
    const realmax = max;

    // most metrics are between 0 and 1, so until we have a better way to know the range
    // of the metrics, we use this heuristics.
    if (max <= 1 && min >= 0) {
      min = 0;
      max = 1;
    }

    let interval = max - min;
    if (interval === 0 || values.length === 1) {
      // only highlight when we have more than one value and when the values are different
      continue;
    }

    if (pivot !== undefined && pivotData === undefined) {
      continue;
    }

    for (let i = 0; i < highlightCells.length; i++) {
      const cell = highlightCells[i];
      // for some reason, style is converted into readonly object when we passed it to HTML element in React
      // so this reassignment is needed to make it writable
      cell.style = { ...cell.style };
      const value = values[i];
      if (pivot === undefined) {
        const newvalue = ((value - min) / interval) * 1000;
        // show the dot, but seems like it's difficult to see when we just want to
        // highlight the best, so just use text mode when highlighting the best
        if (value === realmax) {
          cell.style.fontWeight = "bold";
        }
        if (!isHighlightTheBest) {
          cell.label = (
            <HighlightDot
              label={cell.label}
              bgcolor={rainbow.colorAt(newvalue)}
            />
          );
        }
      } else {
        cell.style.fontWeight = "bold";
        if (value > pivotData!.mean) {
          cell.style.color = red[5];
        } else if (value < pivotData!.mean) {
          cell.style.color = green[5];
        } else {
          cell.style.color = blue[5];
        }
      }
    }
  }
}

const useDotStyles = makeStyles({
  root: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 3,
    right: 4,
  },
});

export const HighlightDot = ({
  label,
  bgcolor,
}: {
  label: React.ReactNode;
  bgcolor: string;
}) => {
  const classes = useDotStyles();

  return (
    <>
      <div className={classes.root} style={{ backgroundColor: bgcolor }} />
      {label}
    </>
  );
};
