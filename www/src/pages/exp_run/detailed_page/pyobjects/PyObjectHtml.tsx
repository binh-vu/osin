import { SanitizedHTML } from "components/SanitizedHTML";
import { PyOHtml } from "models/experiments/pyobject";

export const PyObjectHtml = ({ object }: { object: PyOHtml }) => {
  return <SanitizedHTML html={object.value} />;
};
