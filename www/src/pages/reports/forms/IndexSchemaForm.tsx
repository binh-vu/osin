import { blue, magenta, orange } from "@ant-design/colors";
import { makeStyles } from "@mui/styles";
import { Button, Col, Row, Select, Space, Tree, Typography } from "antd";
import { DataNode } from "antd/lib/tree";
import _ from "lodash";
import { ArrayHelper } from "misc";
import { runInAction, toJS } from "mobx";
import { observer } from "mobx-react";
import { Experiment, useStores } from "models";
import { ParamSchema } from "models/experiments";
import {
  AttrGetter,
  ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS,
  ATTRNAME_PARAMS,
  BaseReport,
  EXPNAME_INDEX_FIELD,
  IndexSchema,
  ReportTableArgs,
} from "models/reports";
import React, { useEffect, useMemo, useState } from "react";
import { Attribute, AttrValue } from "../../../components/reports/ReportData";

const useStyles = makeStyles({
  attrParamStyle: {
    color: blue[5],
    fontWeight: 500,
    marginRight: 4,
    fontSize: "0.9em",
  },
  attrOutputStyle: {
    color: orange[5],
    fontWeight: 500,
    marginRight: 4,
    fontSize: "0.9em",
  },
  attrExpStyle: {
    color: magenta[5],
    fontWeight: 500,
    marginRight: 4,
    fontSize: "0.9em",
  },
});
export type AttrOption = {
  label: React.ReactElement | string;
  value: string;
  attr: Attribute;
  exp?: Experiment;
};
export type AttrValueOption = {
  label: React.ReactElement | string;
  value: AttrValue;
};
const expNameAttribute = new Attribute([EXPNAME_INDEX_FIELD]);

export const IndexSchemaForm = observer(
  ({ exps, index }: { index: IndexSchema; exps: Experiment[] }) => {
    const classes = useStyles();
    const { reportStore } = useStores();
    const [attrValueOptions, setAttrValueOptions] = useState<
      Map<string, AttrValueOption[]>
    >(new Map());

    // gather attributes
    const attrOptions = useMemo(() => {
      let options = exps.flatMap((exp) => {
        return ParamSchema.mergeSchemas(exp.params)
          .leafAttributes()
          .map((attr) => attr.prepend(ATTRNAME_PARAMS))
          .concat(
            exp.aggregatedPrimitiveOutputs
              .leafAttributes()
              .map((attr) =>
                attr.prepend(ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS)
              )
          );
      });
      options = _.uniqBy(options, (attr) => attr.asString());
      options.push(expNameAttribute);
      return options.map((attr) => attr2selectOption(attr, classes));
    }, [exps]);

    // gather index's attributes
    const indexAttrHookKey = index.attrs
      .map((a) => a.attr.asString())
      .join("-");
    const indexAttrOptions = useMemo(() => {
      const obj: { [key: string]: number[] } = {};
      for (let i = 0; i < index.attrs.length; i++) {
        const attrId = index.attrs[i].attr.asString();
        if (obj[attrId] === undefined) {
          obj[attrId] = [];
        }
        obj[attrId].push(i);
      }
      const options = [];
      for (const attrId in obj) {
        if (obj[attrId].length > 1) {
          for (const attrIdx of obj[attrId]) {
            const option = attr2selectOption(
              index.attrs[attrIdx].attr,
              classes
            );
            options.push({
              label: (
                <span>
                  {option.label} ({attrIdx})
                </span>
              ),
              value: attrIdx,
            });
          }
        } else {
          options.push({
            label: attr2selectOption(index.attrs[obj[attrId][0]].attr, classes)
              .label,
            value: obj[attrId][0],
          });
        }
      }
      return options;
    }, [indexAttrHookKey]);

    // gather attribute options
    useEffect(() => {
      const expIds = exps.map((e) => e.id);
      const promises: Promise<[string, AttrValueOption[]]>[] = [];
      for (const attr of index.attrs) {
        const attrId = attr.attr.asString();
        if (attrId === expNameAttribute.asString()) {
          // special case for experiment name, do not need to query the server
          // as this changes dynamically, every time the user selects or adds an experiment
          promises.push(
            Promise.resolve([
              attrId,
              exps.map((e) => ({ value: e.id, label: e.name })),
            ])
          );
        } else if (!attrValueOptions.has(attrId)) {
          promises.push(
            reportStore.fetchAttrValues(attr.attr, expIds).then((values) => {
              return [
                attrId,
                values.map((v) => ({ label: (v || "").toString(), value: v })),
              ];
            })
          );
        }
      }

      Promise.all(promises).then((results) => {
        const newAttrOptions = new Map(results);
        for (const [attrId, values] of attrValueOptions.entries()) {
          if (!newAttrOptions.has(attrId)) {
            newAttrOptions.set(attrId, values);
          }
        }
        setAttrValueOptions(newAttrOptions);
      });
    }, [exps, indexAttrHookKey]);

    const treeData = (() => {
      if (index.roots.length === 0)
        return [treeRecurBuild(0, index, attrOptions, attrValueOptions)];
      return index.roots.map((uid) =>
        treeRecurBuild(uid, index, attrOptions, attrValueOptions)
      );
    })();

    return (
      <>
        <Row>
          <Col span={24}>
            <Tree
              treeData={treeData}
              blockNode={true}
              draggable={false}
              selectable={false}
              expandedKeys={index.attrs.map((_, i) => i)}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <div style={{ fontWeight: 500, marginTop: 4, marginBottom: 4 }}>
              Fully observed attributes
            </div>
            <Space direction="vertical" style={{ width: "100%" }}>
              {(index.fullyObserverdAttrs.length === 0
                ? [[]]
                : index.fullyObserverdAttrs
              ).map((_, i) => (
                <FullyObservedAttrs
                  key={i}
                  item={i}
                  index={index}
                  indexAttrOptions={indexAttrOptions}
                />
              ))}
            </Space>
          </Col>
        </Row>
      </>
    );
  }
);

export const FullyObservedAttrs = observer(
  ({
    item,
    index,
    indexAttrOptions,
  }: {
    item: number;
    indexAttrOptions: { label: React.ReactElement | string; value: number }[];
    index: IndexSchema;
  }) => {
    const observedAttrs = index.fullyObserverdAttrs[item];
    return (
      <Row>
        <Col flex="auto" style={{ paddingRight: 8 }}>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="set of attributes that the combination of values are fully observed from the data"
            value={observedAttrs || []}
            options={indexAttrOptions}
            onChange={(values) => {
              if (observedAttrs === undefined) {
                index.fullyObserverdAttrs.push(values);
              } else {
                index.fullyObserverdAttrs[item] = values;
              }
            }}
          />
        </Col>
        <Col flex="none">
          <Button
            type="link"
            onClick={() => {
              if (observedAttrs === undefined) {
                index.fullyObserverdAttrs.push([]);
              }
              index.fullyObserverdAttrs.push([]);
            }}
          >
            Add
          </Button>
          <Button
            danger={true}
            type="link"
            disabled={index.fullyObserverdAttrs.length <= 1}
            onClick={() => {
              index.fullyObserverdAttrs.splice(item, 1);
            }}
          >
            Remove
          </Button>
        </Col>
      </Row>
    );
  }
);

export const AttrGetterForm = observer(
  ({
    attridx,
    attrOptions,
    isRemovable,
    attrValueOptions,
    index,
    treeStructure = true,
  }: {
    attridx: number;
    index: IndexSchema;
    isRemovable?: boolean;
    attrOptions: AttrOption[];
    attrValueOptions: AttrValueOption[];
    treeStructure?: boolean;
  }) => {
    const attr = index.attrs[attridx];
    return (
      <Row wrap={false}>
        <Col flex="auto" style={{ paddingRight: 8, marginLeft: 8 }}>
          <Row>
            <Col span={12}>
              <Select
                showSearch={true}
                style={{ width: "100%" }}
                value={
                  attr === undefined ? undefined : attr2selectValue(attr.attr)
                }
                options={attrOptions}
                status={attr === undefined ? "error" : ""}
                onChange={(value, option) => {
                  if (attr === undefined) {
                    index.addAttrGetter(
                      new AttrGetter((option as AttrOption).attr, undefined),
                      index.attrs[attridx] === undefined ? undefined : attridx
                    );
                  } else {
                    index.attrs[attridx] = new AttrGetter(
                      (option as AttrOption).attr,
                      undefined
                    );
                  }
                }}
              />
            </Col>
            <Col span={12}>
              <Select
                mode="multiple"
                style={{ width: "100%", marginLeft: 8 }}
                placeholder="set of values to show (optional - empty to show all)"
                options={attrValueOptions}
                value={attr === undefined ? [] : attr.values || []}
                onChange={(values) => {
                  if (values.length === 0) {
                    attr.values = undefined;
                  } else {
                    attr.values = values;
                  }
                }}
              />
            </Col>
          </Row>
        </Col>

        <Col flex="none">
          <Button
            type="link"
            onClick={() => {
              index.addAttrGetter(
                new AttrGetter(
                  Attribute.fromString(attrOptions[0].value),
                  undefined
                ),
                attr === undefined ? undefined : attridx
              );
            }}
          >
            Add
          </Button>
          {treeStructure ? (
            <Button
              type="link"
              onClick={() => {
                index.addChildAttrGetter(
                  new AttrGetter(
                    Attribute.fromString(attrOptions[0].value),
                    undefined
                  ),
                  attr === undefined ? undefined : attridx
                );
              }}
            >
              Add Child
            </Button>
          ) : undefined}
          <Button
            danger={true}
            disabled={!isRemovable}
            type="link"
            onClick={() => index.removeAttrGetter(attridx)}
          >
            Remove
          </Button>
        </Col>
      </Row>
    );
  }
);

export const ZValueForm = observer(
  ({ exps, args }: { args: BaseReport; exps: Experiment[] }) => {
    const classes = useStyles();

    const id2exp = useMemo(() => {
      return Object.fromEntries(exps.map((e) => [e.id, e]));
    }, [exps]);
    const options = useMemo(() => {
      let expoptions: [Experiment, Attribute[]][] = exps.map((exp) => {
        const attrs = ParamSchema.mergeSchemas(exp.params)
          .leafAttributes()
          .map((attr) => attr.prepend(ATTRNAME_PARAMS))
          .concat(
            exp.aggregatedPrimitiveOutputs
              .leafAttributes()
              .map((attr) =>
                attr.prepend(ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS)
              )
          );
        return [exp, attrs];
      });
      const commonOptions = _.intersectionBy(
        ...expoptions.map((x) => x[1]),
        (x: Attribute) => x.asString()
      );
      expoptions = expoptions.filter(([exp, attrs]) => {
        _.pullAllBy(attrs, commonOptions, (x: Attribute) => x.asString());
        return attrs.length > 0;
      });

      return commonOptions
        .map((attr) => attr2selectOption(attr, classes))
        .concat(
          expoptions.flatMap(([exp, attrs]) => {
            return attrs.map((attr) => attr2selectOption(attr, classes, exp));
          })
        );
    }, [exps]);

    return (
      <Row>
        <Col span={24}>
          <Select
            showSearch={true}
            allowClear={true}
            mode="multiple"
            style={{ width: "100%" }}
            status={args.nZValues === 0 ? "error" : ""}
            options={options}
            value={args.zvalues.flatMap(([expId, attrs]) =>
              attrs.map((attr) =>
                attr2selectValue(
                  attr.attr,
                  expId === null ? undefined : id2exp[expId]
                )
              )
            )}
            onChange={(
              _values: string[],
              options: AttrOption | AttrOption[]
            ) => {
              const it: [number | null, Attribute][] = (
                options as AttrOption[]
              ).map((option) => {
                return [
                  option.exp === undefined ? null : option.exp.id,
                  option.attr,
                ];
              });
              const output: Map<number | null, AttrGetter[]> = new Map();
              for (const [expId, attr] of it) {
                if (!output.has(expId)) {
                  output.set(expId, []);
                }
                output.get(expId)!.push(new AttrGetter(attr, undefined));
              }

              args.zvalues = Array.from(output.entries());
            }}
          />
        </Col>
      </Row>
    );
  }
);

const treeRecurBuild = (
  i: number,
  index: IndexSchema,
  attrOptions: AttrOption[],
  attrValueOptions: Map<string, AttrValueOption[]>
): DataNode => {
  return {
    key: i,
    title: (
      <AttrGetterForm
        attridx={i}
        isRemovable={
          index.attrs.length > 1 && index.getTreeSize(i) !== index.attrs.length
        }
        index={index}
        attrOptions={attrOptions}
        attrValueOptions={
          index.attrs[i] === undefined
            ? []
            : attrValueOptions.get(index.attrs[i].attr.asString()) || []
        }
      />
    ),
    children: (index.index2children[i] || []).map((ci) =>
      treeRecurBuild(ci, index, attrOptions, attrValueOptions)
    ),
  };
};

const attr2selectOption = (
  attr: Attribute,
  classes: ReturnType<typeof useStyles>,
  exp?: Experiment
): AttrOption => {
  let expName = undefined;
  if (exp !== undefined) {
    expName = (
      <span style={{ marginRight: 4 }}>
        <small>{exp.name}:</small>
      </span>
    );
  }
  let label;
  if (attr.path[0] === ATTRNAME_PARAMS) {
    label = (
      <span>
        {expName}
        <code className={classes.attrParamStyle}>(P)</code>
        {attr.getLabel()}
      </span>
    );
  } else if (attr.path[0] === ATTRNAME_AGGREGATED_PRIMITIVE_OUTPUTS) {
    label = (
      <span>
        {expName}
        <code className={classes.attrOutputStyle}>(O)</code> {attr.getLabel()}
      </span>
    );
  } else {
    if (attr.path[0] !== EXPNAME_INDEX_FIELD) {
      throw new Error(`Invalid attribute: ${attr.asString()}`);
    }

    label = (
      <span>
        {expName}
        <code className={classes.attrExpStyle}>(E)</code> Special:Experiment
        Name
      </span>
    );
  }

  return {
    label,
    value: attr2selectValue(attr, exp),
    attr,
    exp,
  };
};

const attr2selectValue = (attr: Attribute, exp?: Experiment): string => {
  return (exp === undefined ? "" : exp.id.toString() + ":") + attr.asString();
};
