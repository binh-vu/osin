const reportData = {
  type: "table",
  data: {
    xindex: [
      {
        attr: ["__exp__"],
        children: [
          [
            "exp1",
            [
              {
                attr: ["params.cg_method"],
                children: [
                  [
                    "pyserini",
                    [
                      {
                        attr: ["params.index-type"],
                        children: [
                          ["normal", []],
                          ["enhanced", []],
                        ],
                      },
                    ],
                  ],
                  [
                    "oracle",
                    [
                      {
                        attr: ["params.index-type"],
                        children: [
                          ["normal", []],
                          ["enhanced", []],
                        ],
                      },
                    ],
                  ],
                ],
              },
            ],
          ],
          [
            "exp2",
            [
              {
                attr: ["cr_method"],
                children: [
                  ["xgboost", []],
                  ["random-forest", []],
                ],
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
    data: [],
  },
};

const rowHeaders: any = [
  [
    { label: "__exp__", colspan: 6, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "exp1", colspan: 4, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "exp2", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "params.cg_method", colspan: 4, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "cr_method", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "pyserini", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "oracle", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "xgboost", colspan: 1, rowspan: 3 },
    { label: "random-forest", colspan: 1, rowspan: 3 },
  ],
  [
    { label: "params.index-type", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "params.index-type", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "normal", colspan: 1, rowspan: 1 },
    { label: "enhanced", colspan: 1, rowspan: 1 },
    { label: "normal", colspan: 1, rowspan: 1 },
    { label: "enhanced", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
];
const colHeaders: any = [
  [
    { label: "dataset", colspan: 2, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "biotable", colspan: 1, rowspan: 1 },
    { label: "wt250", colspan: 1, rowspan: 1 },
  ],
];
const tableStructure = `
.--------------------------------------------------------------------------------------------------------------.
|         |          | __exp__           |          |                   |          |           |               |
|         |          | exp1              |          |                   |          | exp2      |               |
|         |          | params.cg_method  |          |                   |          | cr_method |               |
|         |          | pyserini          |          | oracle            |          | xgboost   | random-forest |
|         |          | params.index-type |          | params.index-type |          |           |               |
|         |          | normal            | enhanced | normal            | enhanced |           |               |
| dataset | biotable |                   |          |                   |          |           |               |
|         | wt250    |                   |          |                   |          |           |               |
'--------------------------------------------------------------------------------------------------------------'
`.trim();

const spannedCells = [
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "__exp__", colspan: 6, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "exp1", colspan: 4, rowspan: 1 },
    { label: "exp2", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "params.cg_method", colspan: 4, rowspan: 1 },
    { label: "cr_method", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "pyserini", colspan: 2, rowspan: 1 },
    { label: "oracle", colspan: 2, rowspan: 1 },
    { label: "xgboost", colspan: 1, rowspan: 3 },
    { label: "random-forest", colspan: 1, rowspan: 3 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "params.index-type", colspan: 2, rowspan: 1 },
    { label: "params.index-type", colspan: 2, rowspan: 1 },
  ],
  [
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "normal", colspan: 1, rowspan: 1 },
    { label: "enhanced", colspan: 1, rowspan: 1 },
    { label: "normal", colspan: 1, rowspan: 1 },
    { label: "enhanced", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "dataset", colspan: 1, rowspan: 2 },
    { label: "biotable", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
  [
    { label: "wt250", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
    { label: "", colspan: 1, rowspan: 1 },
  ],
];

export const testcase02 = {
  reportData,
  rowHeaders,
  colHeaders,
  tableStructure,
  spannedCells,
  nExtraRowHeaderCol: 0,
  nExtraColHeaderRow: 0,
  rowHeaderScale: 1,
  colHeaderScale: 1,
};
