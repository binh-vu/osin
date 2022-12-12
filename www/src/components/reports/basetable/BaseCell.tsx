import { ArrayHelper } from "misc";

export interface BaseCell<D> {
  // the cell value.
  label: string | number | boolean | React.ReactNode;
  // data associated with this cell.
  data: D;
  // the row and column index of this cell.
  row: number;
  col: number;
  // whether this cell is a header cell.
  th: boolean;
  // whether this cell is a meta header cell (describing other header cell).
  metaTh: boolean;
  // row/column span of this cell.
  rowSpan: number;
  colSpan: number;
  // the style and class attributes of this cell.
  style: React.CSSProperties;
  className?: string;
}

/**
 *
 */
export class BaseData {
  values: (string | number | boolean | null)[];
  private data:
    | { type: "number"; mean: number; std: number; ci: number; size: number }
    | { type: "single"; value: string | boolean | null }
    | { type: "mixed" }
    | undefined = undefined;

  constructor(values: (string | number | boolean | null)[]) {
    this.values = values;
  }

  getTypes(): string[] {
    return Array.from(new Set(this.values.map((v) => typeof v)));
  }

  computeData() {
    if (this.data === undefined) {
      const types = this.getTypes();
      if (types.length === 1 && types[0] === "number") {
        const vals = this.values as number[];
        const mean = ArrayHelper.mean(vals);
        const std = ArrayHelper.std(vals, mean);
        const ci = (1.96 * std) / Math.sqrt(vals.length);

        this.data = {
          type: "number",
          mean,
          std,
          ci,
          size: vals.length,
        };
      } else if (this.values.length === 1) {
        this.data = {
          type: "single",
          value: this.values[0] as string | boolean | null,
        };
      } else {
        this.data = {
          type: "mixed",
        };
      }
    }
    return this.data;
  }

  isNumber() {
    return this.computeData().type === "number";
  }

  getNumericData():
    | { type: "number"; mean: number; std: number; ci: number; size: number }
    | undefined {
    const data = this.computeData();
    if (data.type === "number") {
      return data;
    }
    return undefined;
  }
}
