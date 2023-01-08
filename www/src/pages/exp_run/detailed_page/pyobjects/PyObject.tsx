import { PyObject } from "models/experiments/pyobject";
import { PyObjectHtml, PyObjectListHtml } from "./PyObjectHtml";
import { PyObjectTable } from "./PyObjectTable";

export const PyObjectComponent = ({ object }: { object: PyObject }) => {
  const type = object.type;
  if (type === "table") {
    return <PyObjectTable object={object} />;
  }

  if (type === "html") {
    return <PyObjectHtml object={object} />;
  }

  if (type === "html-list") {
    return <PyObjectListHtml object={object} />;
  }

  return <div>Not implemented for type: {type}</div>;
};
