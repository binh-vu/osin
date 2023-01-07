import { useMemo } from "react";
import { FilterXSS, getDefaultWhiteList } from "xss";

const colorRegex = /^(#[0-9a-f]+)|([a-zA-Z]+)$/;
const pxRegex = /^(\d+)(px)?$/;

const whitelist = getDefaultWhiteList();
for (const tag in whitelist) {
  whitelist[tag]!.push("style");
}
const myxss = new FilterXSS({
  whiteList: whitelist,
  css: {
    whiteList: {
      position: /^fixed|relative$/,
      top: pxRegex,
      left: pxRegex,
      padding: pxRegex,
      "padding-top": pxRegex,
      "padding-bottom": pxRegex,
      "padding-left": pxRegex,
      "padding-right": pxRegex,
      margin: pxRegex,
      "margin-top": pxRegex,
      "margin-bottom": pxRegex,
      "margin-left": pxRegex,
      "margin-right": pxRegex,
      color: colorRegex,
      background: colorRegex,
      "text-decoration": true,
      "border-radius": pxRegex,
    },
  },
});
export const SanitizedHTML = ({ html }: { html: string }) => {
  const sanitizedHtml = useMemo(() => {
    return myxss.process(html);
  }, [html]);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
