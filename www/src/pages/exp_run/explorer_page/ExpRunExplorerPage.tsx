import { makeStyles } from "@mui/styles";
import { Divider, Tag, Typography } from "antd";
import { InternalLink, LoadingComponent, NotFoundComponent } from "gena-app";
import { observer } from "mobx-react";
import { useEffect } from "react";
import { useStores } from "../../../models";
import { routes } from "../../../routes";
import { ExperimentRunExplorer } from "./ExpRunExplorer";

const useStyles = makeStyles({
  divider: {
    margin: "12px 0px 0px",
  },
});

export const ExpRunExplorerPage = observer(() => {
  const classes = useStyles();
  const expId = routes.runs.useURLParams()!.expId;
  const { expStore } = useStores();

  useEffect(() => {
    expStore.fetchById(expId);
  }, [expStore, expId]);

  const exp = expStore.get(expId);
  if (exp === undefined) {
    return <LoadingComponent />;
  } else if (exp === null) {
    return <NotFoundComponent />;
  }

  return (
    <>
      <Typography.Title level={5} className="ml-16">
        RUN EXPLORER
      </Typography.Title>
      <p className="ml-16">
        <Tag color="blue">VERSION {exp.version}</Tag>
        <InternalLink
          path={routes.expSetup}
          urlArgs={{ expId: exp.id }}
          queryArgs={{}}
          style={{ fontWeight: 600 }}
        >
          {exp.name}
        </InternalLink>
        : {exp.description}
      </p>

      <Divider className={classes.divider} />

      <ExperimentRunExplorer exp={exp} />
    </>
  );
});
