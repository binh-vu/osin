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
      top: true,
      left: true,
      padding: true,
      "padding-top": true,
      "padding-bottom": true,
      "padding-left": true,
      "padding-right": true,
      margin: true,
      "margin-top": true,
      "margin-bottom": true,
      "margin-left": true,
      "margin-right": true,
      color: colorRegex,
      background: colorRegex,
      "text-decoration": true,
      "border-radius": true,
      "font-weight": true,
    },
  },
});

interface PopoverRequiredProps {
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const SanitizedHTML = ({
  html,
  ...props
}: { html: string } & PopoverRequiredProps) => {
  const sanitizedHtml = useMemo(() => {
    return myxss.process(html);
  }, [html]);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} {...props} />;
};
