export interface PyOHtml {
  type: "html";
  value: string;
  popover: string | null;
}

export interface PyOListHtml {
  type: "html-list";
  items: string[];
  popovers: (string | null)[];
  space: number;
}
