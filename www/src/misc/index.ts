export * from "./SequentialFuncInvoker";

export function getClassName(
  ...classes: (string | [boolean, string] | undefined)[]
): string {
  const out = [];

  for (const c of classes) {
    if (c !== undefined) {
      if (typeof c === "string") {
        out.push(c);
      } else if (c[0]) {
        out.push(c[1]);
      }
    }
  }

  return out.join(" ");
}

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
