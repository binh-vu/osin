import { Space, Popover, Tooltip } from "antd";
import { SanitizedHTML } from "components/SanitizedHTML";
import { PyOHtml, PyOListHtml } from "models/experiments/pyobject";

export const PyObjectHtml = ({ object }: { object: PyOHtml }) => {
  return <BaseHTML html={object.value} popover={object.popover} />;
};

export const PyObjectListHtml = ({ object }: { object: PyOListHtml }) => {
  return (
    <Space size={object.space} direction="vertical">
      {object.items.map((item, i) => {
        return <BaseHTML key={i} html={item} popover={object.popovers[i]} />;
      })}
    </Space>
  );
};

const BaseHTML = ({
  html,
  popover,
}: {
  html: string;
  popover: string | null;
}) => {
  let el = <SanitizedHTML html={html} />;
  if (popover !== null) {
    el = <Popover content={<SanitizedHTML html={popover} />}>{el}</Popover>;
  }
  return el;
};
