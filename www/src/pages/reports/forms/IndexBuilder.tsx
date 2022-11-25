import { Button, Col, Radio, Row, Select, Space, Typography } from "antd";
import { AttrValue } from "components/reports";
import _, { values } from "lodash";
import { observer } from "mobx-react";
import { Experiment, useStores } from "models";
import { ParamSchema } from "models/experiments";
import { EXPNAME_INDEX_FIELD, IndexProperty } from "models/reports";
import { useEffect, useMemo } from "react";

export interface RawIndex {
  isExp: false;
  index?: string;
  values?: AttrValue[];
  valueOptions?: AttrValue[];
}

export interface RawExpIndex {
  isExp: true;
  expindex?: { [expId: number]: string };
  expvalues: { [expId: number]: AttrValue[] };
  expvalueOptions: { [expId: number]: AttrValue[] };
}

export type RawAnyIndex = RawIndex | RawExpIndex;

export const MultiLevelIndexBuilder = observer(
  ({
    exps,
    indices,
    setIndices,
    property,
    isZValues = false,
  }: {
    isZValues?: boolean;
    exps: Experiment[];
    indices: RawAnyIndex[];
    setIndices: (dims: RawAnyIndex[]) => void;
    property: IndexProperty;
  }) => {
    const { reportStore } = useStores();
    // fetch options of an index
    useEffect(() => {
      if (property === "aggregated_primitive_outputs") return;

      let newindices: RawAnyIndex[] | undefined = undefined;
      let expIds: number[] = [];
      const promises: Promise<void>[] = [];

      // indices.forEach((idx, i) => {
      //   if (
      //     !idx.isExp &&
      //     idx.index !== undefined &&
      //     idx.valueOptions === undefined
      //   ) {
      //     if (newindices === undefined) {
      //       newindices = indices.slice();
      //       expIds = exps.map((e) => e.id);
      //     }
      //     promises.push(
      //       reportStore
      //         .fetchAttrValues(idx.index.split("."), expIds, property)
      //         .then((values) => {
      //           (newindices![i] as RawIndex).valueOptions = values;
      //         })
      //     );
      //   } else if (idx.isExp && idx.expindex !== undefined) {
      //     for (const expid in idx.expindex) {
      //       if (idx.expvalueOptions[expid] === undefined) {
      //         // fetch values
      //         if (newindices === undefined) {
      //           newindices = indices.slice();
      //           expIds = exps.map((e) => e.id);
      //         }

      //         promises.push(
      //           reportStore
      //             .fetchAttrValues(
      //               idx.expindex[expid].split("."),
      //               [parseInt(expid)],
      //               property
      //             )
      //             .then((values) => {
      //               (newindices![i] as RawExpIndex).expvalueOptions[expid] =
      //                 values;
      //             })
      //         );
      //       }
      //     }
      //   }
      // });

      Promise.all(promises).then(() => {
        if (newindices !== undefined) {
          setIndices(newindices);
        }
      });
    }, [indices]);

    // get dimension options
    const [commonIndexOptions, expIndexOptions] = useMemo(() => {
      let expOptions: [number, string[]][] = exps.map((exp) => {
        const attrs =
          property === "params"
            ? ParamSchema.mergeSchemas(exp.params).leafAttributes()
            : exp.aggregatedPrimitiveOutputs.leafAttributes();
        return [exp.id, attrs.map((attrpath) => attrpath.asString())];
      });
      const commonOptions = _.intersection(...expOptions.map((lst) => lst[1]));

      const respCommonOptions = commonOptions.map((opt) => ({
        label: opt,
        value: opt,
      }));
      const respExpOptions = Object.fromEntries(
        expOptions.map(([expid, opts]) => [
          expid,
          opts.map((opt) => ({
            label: opt,
            value: opt,
          })),
        ])
      );

      respCommonOptions.push({
        label: "Special:Experiment Name",
        value: EXPNAME_INDEX_FIELD,
      });
      return [respCommonOptions, respExpOptions];
    }, [exps, property]);

    if (isZValues) {
      return (
        <ZValuesBuilder
          exps={exps}
          commonIndexOptions={commonIndexOptions}
          expIndexOptions={expIndexOptions}
          indices={indices}
          setIndices={setIndices}
        />
      );
    }

    const elements = indices.map((idx, i) => {
      if (idx.isExp) {
        return (
          <ExpIndexBuilder
            key={i}
            order={i}
            exps={exps}
            indexoptions={expIndexOptions}
            indices={indices}
            setIndices={setIndices}
          />
        );
      }
      return (
        <IndexBuilder
          key={i}
          order={i}
          indexoptions={commonIndexOptions}
          indices={indices}
          setIndices={setIndices}
        />
      );
    });

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        {elements}
      </Space>
    );
  }
);

export const ZValuesBuilder = ({
  exps,
  commonIndexOptions,
  expIndexOptions,
  indices,
  setIndices,
  showOnlyNumericOptions = true,
}: {
  exps: Experiment[];
  commonIndexOptions: { label: React.ReactElement | string; value: string }[];
  expIndexOptions: {
    [expid: number]: { label: React.ReactElement | string; value: string }[];
  };
  indices: RawAnyIndex[];
  setIndices: (dims: RawAnyIndex[]) => void;
  showOnlyNumericOptions?: boolean;
}) => {
  const nonexpIndices = indices.filter(isNotExpIndex);
  const expIndices = indices.filter(isExpIndex);

  const mergedExpIndices: { [expid: number]: string[] } = Object.fromEntries(
    exps.map((e) => [e.id, []])
  );
  expIndices.map((exp) => {
    const expindex = exp.expindex || {};
    for (const expid in expindex) {
      mergedExpIndices[expid].push(expindex[expid]);
    }
  });
  let rows = undefined;

  if (exps.length > 1) {
    const col1 = [];
    const col2 = [];
    for (const exp of exps) {
      const expoptions = expIndexOptions[exp.id];
      if (showOnlyNumericOptions) {
        expoptions.filter((opt) => {
          return (
            opt.value !== EXPNAME_INDEX_FIELD &&
            exp.aggregatedPrimitiveOutputs
              .getLeafAttribute(opt.value.split("."))
              .isNumber()
          );
        });
      }

      col1.push(
        <Button type="link" key={exp.id}>
          {exp.name}
        </Button>
      );
      col2.push(
        <Select
          mode="multiple"
          key={exp.id}
          style={{ width: "100%" }}
          value={mergedExpIndices[exp.id]}
          options={expoptions}
          onChange={(values: string[]) => {
            const newExpIndices: RawExpIndex[] = expIndices.slice();
            for (
              let i = 0;
              i < Math.max(values.length, expIndices.length);
              i++
            ) {
              if (i < values.length && i < newExpIndices.length) {
                const newExpIndex = newExpIndices[i];
                if (newExpIndex.expindex === undefined) {
                  newExpIndex.expindex = {};
                }
                newExpIndex.expindex[exp.id] = values[i];
              } else if (i >= newExpIndices.length) {
                newExpIndices.push({
                  isExp: true,
                  expindex: { [exp.id]: values[i] },
                  expvalues: {},
                  expvalueOptions: {},
                });
              } else {
                const newExpIndex = newExpIndices[i];
                if (newExpIndex.expindex !== undefined) {
                  delete newExpIndex.expindex[exp.id];
                  if (Object.keys(newExpIndex.expindex).length === 0) {
                    delete newExpIndex.expindex;
                  }
                }
              }
            }

            setIndices((nonexpIndices as RawAnyIndex[]).concat(newExpIndices));
          }}
        />
      );
    }

    rows = (
      <Row wrap={false}>
        <Col flex="none">
          <Space direction="vertical" style={{ width: "100%" }}>
            {col1}
          </Space>
        </Col>
        <Col flex="auto">
          <Space direction="vertical" style={{ width: "100%" }}>
            {col2}
          </Space>
        </Col>
      </Row>
    );
  }

  if (showOnlyNumericOptions) {
    commonIndexOptions = commonIndexOptions.filter((opt) => {
      if (opt.value === EXPNAME_INDEX_FIELD) {
        return false;
      }
      const nNumbers = exps
        .map((exp) =>
          exp.aggregatedPrimitiveOutputs
            .getLeafAttribute(opt.value.split("."))
            .isNumber()
            ? 1
            : 0
        )
        .reduce((a: number, b) => a + b, 0);

      if (nNumbers === exps.length) {
        return true;
      }
      if (nNumbers !== exps.length) {
        console.warn(
          `ZValuesBuilder: ${opt.value} in some experiments is not a number and in some is a number. Because of that it is ignored`
        );
      }
      return false;
    });
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Row>
        <Col span={24}>
          <Select
            style={{ width: "100%" }}
            mode="multiple"
            value={nonexpIndices.map((d) => d.index!)}
            options={commonIndexOptions}
            status={indices.length === 0 ? "error" : ""}
            onChange={(values: string[]) => {
              const nonexp: RawAnyIndex[] = values.map((dim) => ({
                index: dim,
                isExp: false,
              }));
              setIndices(nonexp.concat(expIndices));
            }}
          />
        </Col>
      </Row>
      {rows}
    </Space>
  );
};

export const IndexBuilder = ({
  order,
  indexoptions,
  indices,
  setIndices,
}: {
  order: number;
  indexoptions: { label: React.ReactElement | string; value: string }[];
  indices: RawAnyIndex[];
  setIndices: (dims: RawAnyIndex[]) => void;
}) => {
  const index = indices[order] as RawIndex;
  return (
    <Row wrap={false}>
      <Col flex="none">
        <IndexTypeSwitch
          order={order}
          indices={indices}
          setIndices={setIndices}
        />
      </Col>
      <Col flex="auto" style={{ paddingRight: 8, marginLeft: 8 }}>
        <Row>
          <Col span={12}>
            <Select
              showSearch={true}
              allowClear={true}
              style={{ width: "100%" }}
              value={index.index}
              options={indexoptions}
              status={index.index === undefined ? "error" : ""}
              onChange={(value) =>
                updateIndex(
                  order,
                  { isExp: false, index: value },
                  indices,
                  setIndices
                )
              }
            />
          </Col>
          <Col span={12}>
            <Select
              mode="multiple"
              style={{ width: "100%", marginLeft: 8 }}
              placeholder="set of values to show (optional - empty to show all)"
              options={(index.valueOptions || []).map((v) => ({
                label: (v || "").toString(),
                value: v,
              }))}
            />
          </Col>
        </Row>
      </Col>

      <Col flex="none">
        {indices.length > 1 ? (
          <Button
            danger={true}
            type="link"
            onClick={() => removeIndex(order, indices, setIndices)}
          >
            Remove
          </Button>
        ) : null}
        <Button
          type="link"
          onClick={() =>
            addIndex(order + 1, { isExp: false }, indices, setIndices)
          }
        >
          Add
        </Button>
      </Col>
    </Row>
  );
};

export const ExpIndexBuilder = ({
  exps,
  order,
  indexoptions,
  indices,
  setIndices,
}: {
  order: number;
  exps: Experiment[];
  indexoptions: {
    [expid: number]: { label: React.ReactElement | string; value: string }[];
  };
  indices: RawAnyIndex[];
  setIndices: (dims: RawAnyIndex[]) => void;
}) => {
  const index = indices[order] as RawExpIndex;
  const expindex = index.expindex || {};

  const col1 = [];
  const col2 = [];
  const col3 = [];

  for (let exp of exps) {
    col1.push(
      <Button type="link" key={exp.id}>
        {exp.name}
      </Button>
    );
    col2.push(
      <Select
        showSearch={true}
        allowClear={true}
        style={{ width: "100%" }}
        key={exp.id}
        value={expindex[exp.id]}
        options={indexoptions[exp.id]}
        onChange={(value: string | undefined) => {
          let newindex = Object.assign({}, index);
          if (newindex.expindex === undefined) {
            if (value !== undefined) {
              newindex.expindex = { [exp.id]: value };
            }
          } else {
            if (value === undefined) {
              delete newindex.expindex[exp.id];
            } else {
              newindex.expindex[exp.id] = value;
            }
          }
          updateIndex(order, newindex, indices, setIndices);
        }}
      />
    );
    col3.push(
      <Select
        key={exp.id}
        mode="multiple"
        style={{ width: "100%" }}
        placeholder="set of values to show (optional - empty to show all)"
        options={(index.expvalueOptions[exp.id] || []).map((v) => ({
          label: (v || "").toString(),
          value: v,
        }))}
        value={index.expvalues[exp.id] || []}
        onChange={(values: AttrValue[]) => {
          let newindex = Object.assign({}, index);
          newindex.expvalues[exp.id] = values;
          updateIndex(order, newindex, indices, setIndices);
        }}
      />
    );
  }

  return (
    <Row wrap={false}>
      <Col flex="none">
        <IndexTypeSwitch
          order={order}
          indices={indices}
          setIndices={setIndices}
        />
      </Col>
      <Col flex="auto" style={{ marginLeft: 8 }}>
        <Row wrap={false}>
          <Col flex="none">
            <Space direction="vertical" style={{ width: "100%" }}>
              {col1}
            </Space>
          </Col>
          <Col flex="auto" style={{ paddingRight: 8 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              {col2}
            </Space>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" style={{ width: "100%" }}>
              {col3}
            </Space>
          </Col>
        </Row>
      </Col>
      <Col flex="none">
        {indices.length > 1 ? (
          <Button
            danger={true}
            type="link"
            onClick={() => removeIndex(order, indices, setIndices)}
          >
            Remove
          </Button>
        ) : null}
        <Button
          type="link"
          onClick={() =>
            addIndex(order + 1, { isExp: false }, indices, setIndices)
          }
        >
          Add
        </Button>
      </Col>
    </Row>
  );
};

/** Switch type of an index. When we switch type, all previous values will be clear */
export const IndexTypeSwitch = ({
  order,
  indices,
  setIndices,
}: {
  order: number;
  indices: RawAnyIndex[];
  setIndices: (dims: RawAnyIndex[]) => void;
}) => {
  const index = indices[order];
  return (
    <Radio.Group
      options={[
        { label: "All", value: false },
        { label: "Exp", value: true },
      ]}
      value={index.isExp}
      onChange={(e) => {
        updateIndex(
          order,
          e.target.value === true
            ? { isExp: true, expvalues: {}, expvalueOptions: {} }
            : { isExp: false },
          indices,
          setIndices
        );
      }}
      optionType="button"
      buttonStyle="solid"
    />
  );
};

export function removeIndex(
  i: number,
  indices: RawAnyIndex[],
  setIndices: (indices: RawAnyIndex[]) => void
) {
  const newdims = indices.slice();
  newdims.splice(i, 1);
  setIndices(newdims);
}

export function addIndex(
  i: number,
  newIndex: RawAnyIndex,
  indices: RawAnyIndex[],
  setIndices: (indices: RawAnyIndex[]) => void
) {
  const newdims = indices.slice();
  newdims.splice(i, 0, newIndex);
  setIndices(newdims);
}

export function updateIndex(
  i: number,
  newIndex: RawAnyIndex,
  indices: RawAnyIndex[],
  setIndices: (indices: RawAnyIndex[]) => void
) {
  const newdims = indices.slice();
  newdims[i] = newIndex;
  setIndices(newdims);
}

function isNotExpIndex(v: RawAnyIndex): v is RawIndex {
  return !v.isExp;
}

function isExpIndex(v: RawAnyIndex): v is RawExpIndex {
  return v.isExp;
}
