export * from "./SequentialFuncInvoker";
export * from "./ArrayUtils";

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

export class IsMounted {
  // whether the component is mounted
  protected flag: boolean;

  constructor(flag: boolean) {
    this.flag = flag;
  }

  public unmount = () => {
    this.flag = false;
  };

  public isMounted() {
    return this.flag;
  }

  public isUnmounted() {
    return !this.flag;
  }
}
