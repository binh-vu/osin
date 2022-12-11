const reportData = {
  data: {
    data: [
      {
        record_id: 2,
        record_value: 0.7234941666727885,
        x: ["pyserini", "fuzzy"],
        y: ["biotable"],
        z: ["aggregated_primitive_outputs", "mrr"],
      },
      {
        record_id: 7,
        record_value: 0.929616724738676,
        x: ["pyserini", "fuzzy"],
        y: ["biotable"],
        z: ["aggregated_primitive_outputs", "recall@100"],
      },
    ],
    xindex: [
      {
        attr: ["params", "cg_method"],
        children: [
          [
            "oracle_semtyper",
            [
              {
                attr: ["params", "oracle_semtyper", "filter_mode"],
                children: [["exact", []]],
              },
            ],
          ],
          [
            "pyserini",
            [
              {
                attr: ["params", "pyserini", "query_types"],
                children: [["fuzzy", []]],
              },
            ],
          ],
        ],
      },
    ],
    yindex: [
      {
        attr: ["params", "dataset"],
        children: [
          ["biotable", []],
          ["wt250", []],
        ],
      },
    ],
  },
  type: "table",
};

const rowHeaders = [
  [
    { label: "cg_method", colSpan: 4, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "oracle_semtyper", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "pyserini", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "oracle_semtyper.filter_mode", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "pyserini.query_types", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "exact", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "fuzzy", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
];

const colHeaders = [
  [
    { label: "dataset", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    {
      label: "biotable",
      colSpan: 1,
      rowSpan: 1,
    },
    { label: "wt250", colSpan: 1, rowSpan: 1 },
  ],
];

const tableStructure = `
.-------------------------------------------------------------------------------.
|         |          | cg_method                   |  |                      |  |
|         |          | oracle_semtyper             |  | pyserini             |  |
|         |          | oracle_semtyper.filter_mode |  | pyserini.query_types |  |
|         |          | exact                       |  | fuzzy                |  |
|         |          |                             |  |                      |  |
| dataset | biotable |                             |  |                      |  |
|         | wt250    |                             |  |                      |  |
'-------------------------------------------------------------------------------'
`.trim();

const spannedCells = [
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "cg_method", colSpan: 4, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "oracle_semtyper", colSpan: 2, rowSpan: 1 },
    { label: "pyserini", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "oracle_semtyper.filter_mode", colSpan: 2, rowSpan: 1 },
    { label: "pyserini.query_types", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "exact", colSpan: 2, rowSpan: 1 },
    { label: "fuzzy", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "dataset", colSpan: 1, rowSpan: 2 },
    {
      label: "biotable",
      colSpan: 1,
      rowSpan: 1,
    },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    {
      label: "wt250",
      colSpan: 1,
      rowSpan: 1,
    },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
];

export const testcase03 = {
  reportData,
  rowHeaders,
  colHeaders,
  tableStructure,
  spannedCells,
  nExtraRowHeaderCol: 0,
  nExtraColHeaderRow: 1,
  rowHeaderScale: 1,
  colHeaderScale: 2,
};
