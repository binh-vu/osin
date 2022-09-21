import { makeStyles } from "@mui/styles";
import { Typography } from "antd";
import { getClassName } from "misc";

const useStyles = makeStyles({
  root: {
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  bordered: {
    border: "1px solid #ddd",
  },
});

export const InfoCard = ({
  title,
  bordered = true,
  children,
  className,
  style,
}: {
  title: string;
  bordered?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const classes = useStyles();

  return (
    <div
      className={getClassName(
        classes.root,
        [bordered, classes.bordered],
        className
      )}
      style={style}
    >
      <Typography.Title level={2}>{title}</Typography.Title>
      {children}
    </div>
  );
};
