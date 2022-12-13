export const ArrayHelper = {
  remove: <T>(i: number, arr: T[], setArr: (indices: T[]) => void) => {
    const newarr = arr.slice();
    newarr.splice(i, 1);
    setArr(newarr);
  },
  add: <T>(
    i: number,
    newItem: T,
    arr: T[],
    setIndices: (indices: T[]) => void
  ) => {
    const newarr = arr.slice();
    newarr.splice(i, 0, newItem);
    setIndices(newarr);
  },
  update: <T>(i: number, item: T, arr: T[], setArr: (indices: T[]) => void) => {
    const newdims = arr.slice();
    newdims[i] = item;
    setArr(newdims);
  },
  zeros: (n: number) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(0);
    }
    return out;
  },
  new2d: <C>(
    height: number,
    width: number,
    cell: C | ((i: number, j: number) => C)
  ): C[][] => {
    const arr = [];
    for (let i = 0; i < height; i++) {
      const row = [];
      for (let j = 0; j < width; j++) {
        row.push(typeof cell === "function" ? (cell as any)(i, j) : cell);
      }
      arr.push(row);
    }
    return arr;
  },
  sum: (arr: number[]) => {
    let sum = 0;
    for (const x of arr) {
      sum += x;
    }
    return sum;
  },
  mean: (arr: number[]) => {
    return ArrayHelper.sum(arr) / arr.length;
  },
  std: (arr: number[], mean?: number) => {
    mean = mean || ArrayHelper.mean(arr);
    let sum = 0;
    for (const x of arr) {
      sum += (x - mean) ** 2;
    }
    return Math.sqrt(sum / arr.length);
  },
  sort: <C>(
    arr: C[][],
    sorts: { index: number; order: "asc" | "desc" }[],
    start: number = 0,
    end: number = arr.length,
    field?: (obj: C) => string | number
  ): number[] => {
    if (arr.length === 0) return [];
    const indexArr = [];
    for (let i = start; i < end; i++) {
      indexArr.push(i);
    }
    indexArr.sort((i, j) => ArrayHelper.compare(arr[i], arr[j], sorts, field));

    const tmparr = indexArr.map((i) => arr[i]);
    for (let i = start; i < end; i++) {
      arr[i] = tmparr[i - start];
    }
    return indexArr;
  },
  compare: <C>(
    itemA: C[],
    itemB: C[],
    sorts: { index: number; order: "asc" | "desc" }[],
    field?: (obj: C) => string | number
  ) => {
    for (let sort of sorts) {
      const v1 =
        field !== undefined ? field(itemA[sort.index]) : itemA[sort.index];
      const v2 =
        field !== undefined ? field(itemB[sort.index]) : itemB[sort.index];
      if (v1 < v2) {
        return sort.order === "asc" ? -1 : 1;
      }
      if (v1 > v2) {
        return sort.order === "asc" ? 1 : -1;
      }
    }
    return 0;
  },
};

export const Filter = {
  notNull: <T>(x: T | null): x is T => x !== null,
  notUndefined: <T>(x: T | undefined): x is T => x !== undefined,
  notNullOrUndefined: <T>(x: T | null | undefined): x is T =>
    x !== null && x !== undefined,
};

export function arrayRemove<T>(array: T[], item: T) {
  let idx = array.indexOf(item);
  if (idx >= 0) {
    array.splice(idx, 1);
  }
}

export function arrayReverse<T>(array: T[]): T[] {
  let out = [];
  for (let i = array.length - 1; i >= 0; i--) {
    out.push(array[i]);
  }
  return out;
}

export function arrayFindLastIndex<T>(
  array: T[],
  callback: (item: T) => boolean,
  defaultIndex: number = -1
): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (callback(array[i])) {
      return i;
    }
  }
  return defaultIndex;
}
