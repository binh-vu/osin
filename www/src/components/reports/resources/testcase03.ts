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
    { label: "cg_method", colspan: 4, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "oracle_semtyper", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "pyserini", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "oracle_semtyper.filter_mode", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "pyserini.query_types", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "exact", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "fuzzy", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
];

const colHeaders = [
  [
    { label: "dataset", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    {
      label: "biotable",
      colspan: 1,
      rowspan: 1,
    },
    { label: "wt250", colspan: 1, rowspan: 1 },
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
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "cg_method", colspan: 4, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "oracle_semtyper", colspan: 2, rowspan: 1 },
    { label: "pyserini", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "oracle_semtyper.filter_mode", colspan: 2, rowspan: 1 },
    { label: "pyserini.query_types", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "exact", colspan: 2, rowspan: 1 },
    { label: "fuzzy", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "dataset", colspan: 1, rowspan: 2 },
    {
      label: "biotable",
      colspan: 1,
      rowspan: 1,
    },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    {
      label: "wt250",
      colspan: 1,
      rowspan: 1,
    },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
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
