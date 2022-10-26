import { PyObject } from "models/experiments/ExperimentRunData";
import { PyObjectTable } from "./PyObjectTable";

export const PyObjectComponent = ({ object }: { object: PyObject }) => {
  if (object.type === "table") {
    return <PyObjectTable object={object} />;
  }

  return <div>Not implemented for type: {object.type}</div>;
};
