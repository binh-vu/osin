import { PyObject } from "models/experiments/pyobject";
import { PyObjectHtml } from "./PyObjectHtml";
import { PyObjectTable } from "./PyObjectTable";

export const PyObjectComponent = ({ object }: { object: PyObject }) => {
  const type = object.type;
  if (type === "table") {
    return <PyObjectTable object={object} />;
  }

  if (type === "html") {
    return <PyObjectHtml object={object} />;
  }

  return <div>Not implemented for type: {type}</div>;
};
