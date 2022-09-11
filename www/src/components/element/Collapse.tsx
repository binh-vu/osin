import { makeStyles } from "@mui/styles";
import React, { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { Space } from "antd";

export const useStyles = makeStyles({
  hide: {
    display: "none",
  },
});
export const CollapsibleComponent = (
  props: React.PropsWithChildren<{ collapsible: React.ReactNode }>
) => {
  const classes = useStyles();
  const [visible, setVisible] = useState(false);
  const toggleVisible = () => {
    setVisible(!visible);
  };
  const btn = visible ? (
    <EyeInvisibleOutlined onClick={toggleVisible} />
  ) : (
    <EyeOutlined onClick={toggleVisible} />
  );

  return (
    <div>
      <Space size={4}>
        {props.children}
        {btn}
      </Space>
      <div className={visible ? "gena-app" : classes.hide}>
        {props.collapsible}
      </div>
    </div>
  );
};
