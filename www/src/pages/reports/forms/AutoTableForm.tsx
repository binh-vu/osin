import { makeStyles } from "@mui/styles";
import {
  Alert,
  Button,
  Col,
  Divider,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { ReportData, TableComponent } from "components/reports";
import { InternalLink, LoadingComponent } from "gena-app";
import _ from "lodash";
import { Filter } from "misc";
import { autorun, comparer, reaction, runInAction } from "mobx";
import { observer } from "mobx-react";
import { Experiment, Report, useStores } from "models";
import { ParamSchema } from "models/experiments";
import {
  ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS,
  ATTRNAME_PARAMS,
  AutoTableReport,
  AutoTableReportGroup,
  BaseReport,
  COLUMN_MAX_SIZE,
  DraftCreateReport,
  DraftUpdateReport,
  IndexSchema,
  RecordFilter,
  ReportTableArgs,
} from "models/reports";
import {
  attr2selectOption,
  AttrGetterForm,
  AttrOption,
  AttrValueOption,
  expNameAttribute,
  IndexSchemaForm,
  useAttrOptions,
  useAttrValueOptions,
  ZValueForm,
} from "pages/reports/forms/IndexSchemaForm";
import { createRef, useEffect, useMemo, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { routes } from "routes";
import { ReportComponent, ReportTableFunc } from "../ReportComponent";
import { useStyles } from "./ReportForm";
import { useStyles as useIndexSchemaFormStyles2 } from "pages/reports/forms/IndexSchemaForm";

export const AutoTableForm = observer(
  ({
    classes,
    exps,
    autoTableReport,
  }: {
    classes: ReturnType<typeof useStyles>;
    autoTableReport: AutoTableReport;
    exps: Experiment[];
  }) => {
    const indexSchemaFormClasses = useIndexSchemaFormStyles2();
    // gather attributes & their options
    const attrOptions = useAttrOptions(exps, indexSchemaFormClasses);
    const attrValueOptions = useAttrValueOptions(
      exps,
      autoTableReport.groups.flatMap((g) => g[1].isIn)
    );

    const groups = autoTableReport.groups.map((group, i) => (
      <Group
        key={i}
        isRemovable={autoTableReport.groups.length > 1}
        group={group}
        attrOptions={attrOptions}
        attrValueOptions={attrValueOptions}
        addGroup={(group: AutoTableReportGroup) => {
          autoTableReport.groups.push(group);
        }}
        removeGroup={() => {
          autoTableReport.groups.splice(i, 1);
        }}
        replaceGroup={(group: AutoTableReportGroup) => {
          autoTableReport.groups[i] = group;
        }}
      />
    ));
    if (autoTableReport.groups.length === 0) {
      groups.push(
        <Group
          key={"new"}
          group={undefined}
          attrOptions={attrOptions}
          attrValueOptions={attrValueOptions}
          addGroup={(group: AutoTableReportGroup) => {
            autoTableReport.groups.push(group);
          }}
          isRemovable={false}
          removeGroup={() => {}}
          replaceGroup={(group: AutoTableReportGroup) => {}}
        />
      );
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }} size={16}>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Groups
            </Typography.Title>
            <Space direction="vertical" style={{ width: "100%" }} size={4}>
              {groups}
            </Space>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              Z Values
            </Typography.Title>
            <ZValueForm
              exps={exps}
              zvalues={[[null, autoTableReport.zvalues]]}
              setZValues={(zvalues) => {
                autoTableReport.zvalues = zvalues[0][1];
              }}
              noExpSpecificZValues={true}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Typography.Title level={5} className={classes.formItemLabel}>
              <Space direction="horizontal">
                Ignore List Attributes
                <Switch
                  checkedChildren="&nbsp;&nbsp;Ignored&nbsp;&nbsp;"
                  unCheckedChildren="Not Ignored"
                  checked={autoTableReport.ignoreListAttr}
                  onChange={(checked) => {
                    autoTableReport.ignoreListAttr = checked;
                  }}
                />
              </Space>
            </Typography.Title>
          </Col>
        </Row>
      </Space>
    );
  }
);

const Group = observer(
  ({
    group,
    attrOptions,
    attrValueOptions,
    addGroup,
    replaceGroup,
    removeGroup,
    isRemovable,
  }: {
    group?: AutoTableReportGroup;
    isRemovable: boolean;
    attrOptions: AttrOption[];
    attrValueOptions: Map<string, AttrValueOption[]>;
    addGroup: (group: AutoTableReportGroup) => void;
    replaceGroup: (group: AutoTableReportGroup) => void;
    removeGroup: () => void;
  }) => {
    let filteredAttrs = undefined;
    if (group !== undefined) {
      filteredAttrs = group[1].isIn.map((attr, i) => {
        return (
          <AttrGetterForm
            key={i}
            attr={attr}
            attrOptions={attrOptions}
            attrValueOptions={attrValueOptions.get(attr.attr.asString()) || []}
            isRemovable={group[1].isIn.length > 1}
            addAttr={(attr) => {
              group[1].isIn.push(attr);
            }}
            removeAttr={() => {
              group[1].isIn.splice(i, 1);
            }}
            replaceAttr={(attr) => {
              group[1].isIn[i] = attr;
            }}
            placeholder="values to filter by"
            mustHasAttrValue={true}
          />
        );
      });

      if (group[1].isIn.length === 0) {
        filteredAttrs.push(
          <AttrGetterForm
            key={"new"}
            attr={undefined}
            attrOptions={attrOptions}
            attrValueOptions={[]}
            isRemovable={group[1].isIn.length > 1}
            addAttr={(attr) => {
              if (group === undefined) {
                addGroup(["", new RecordFilter([attr])]);
              } else {
                group[1].isIn.push(attr);
              }
            }}
            removeAttr={() => {}}
            replaceAttr={(attr) => {}}
            placeholder="values to filter by"
            mustHasAttrValue={true}
          />
        );
      }
    }

    return (
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        <Row>
          <Col span={24}>
            <Row wrap={false}>
              <Col flex="auto" style={{ paddingRight: 8 }}>
                <Input
                  placeholder="Enter group name"
                  status={
                    group !== undefined && group[0].length === 0 ? "error" : ""
                  }
                  value={group === undefined ? undefined : group[0]}
                  onChange={(e) => {
                    if (group === undefined) {
                      addGroup([e.target.value, new RecordFilter([])]);
                    } else {
                      group[0] = e.target.value;
                    }
                  }}
                  bordered={false}
                />
              </Col>
              <Col flex="none">
                <Button
                  type="link"
                  onClick={() => {
                    addGroup(["", new RecordFilter([])]);
                  }}
                >
                  Add Group
                </Button>
                <Button
                  danger={true}
                  disabled={!isRemovable}
                  type="link"
                  onClick={() => removeGroup()}
                >
                  Remove Group
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Space direction="vertical" style={{ width: "100%" }} size={4}>
              {filteredAttrs}
            </Space>
          </Col>
        </Row>
      </Space>
    );
  }
);
