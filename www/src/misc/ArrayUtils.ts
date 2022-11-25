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
  update: <T>(
    i: number,
    newIndex: T,
    indices: T[],
    setIndices: (indices: T[]) => void
  ) => {
    const newdims = indices.slice();
    newdims[i] = newIndex;
    setIndices(newdims);
  },
  zeros: (n: number) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(0);
    }
    return out;
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