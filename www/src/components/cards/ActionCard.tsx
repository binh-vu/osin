import { makeStyles } from "@mui/styles";
import { Typography } from "antd";
import { getClassName } from "misc";

const useStyles = makeStyles({
  root: {
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bordered: {
    border: "1px solid #ddd",
  },
});

export const ActionCard = ({
  title,
  description,
  bordered = true,
  className,
  children,
  style,
}: {
  title: string;
  description: string;
  bordered?: boolean;
  className?: string;
  children?: React.ReactNode;
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
      <div>
        <Typography.Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Typography.Title>
        <span>{description}</span>
      </div>
      <div>{children}</div>
    </div>
  );
};
