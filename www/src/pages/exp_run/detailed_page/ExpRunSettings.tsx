import { makeStyles } from "@mui/styles";
import { ExperimentRun, useStores } from "models";
import { ActionCard } from "components/cards/ActionCard";
import { Button, Col, Row } from "antd";
import { routes } from "routes";

const useStyles = makeStyles({});

export const ExpRunSettings = ({ expRun }: { expRun: ExperimentRun }) => {
  const { expRunStore } = useStores();

  const deleteExpRun = () => {
    expRunStore.delete(expRun.id);
    routes.runs.path({ expId: expRun.exp }).open();
  };

  return (
    <div className="ml-16 mr-16">
      <Row>
        <Col span={16} offset={4}>
          <ActionCard
            title="Delete Run"
            description="Once you delete a run, there is no going back. Please be certain."
          >
            <Button type="primary" danger={true} onClick={deleteExpRun}>
              Delete
            </Button>
          </ActionCard>
        </Col>
      </Row>
    </div>
  );
};
