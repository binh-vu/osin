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
