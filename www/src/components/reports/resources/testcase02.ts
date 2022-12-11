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
    { label: "__exp__", colSpan: 6, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "exp1", colSpan: 4, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "exp2", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "params.cg_method", colSpan: 4, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "cr_method", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "pyserini", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "oracle", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "xgboost", colSpan: 1, rowSpan: 3 },
    { label: "random-forest", colSpan: 1, rowSpan: 3 },
  ],
  [
    { label: "params.index-type", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "params.index-type", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "normal", colSpan: 1, rowSpan: 1 },
    { label: "enhanced", colSpan: 1, rowSpan: 1 },
    { label: "normal", colSpan: 1, rowSpan: 1 },
    { label: "enhanced", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
];
const colHeaders: any = [
  [
    { label: "dataset", colSpan: 2, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "biotable", colSpan: 1, rowSpan: 1 },
    { label: "wt250", colSpan: 1, rowSpan: 1 },
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
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "__exp__", colSpan: 6, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "exp1", colSpan: 4, rowSpan: 1 },
    { label: "exp2", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "params.cg_method", colSpan: 4, rowSpan: 1 },
    { label: "cr_method", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "pyserini", colSpan: 2, rowSpan: 1 },
    { label: "oracle", colSpan: 2, rowSpan: 1 },
    { label: "xgboost", colSpan: 1, rowSpan: 3 },
    { label: "random-forest", colSpan: 1, rowSpan: 3 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "params.index-type", colSpan: 2, rowSpan: 1 },
    { label: "params.index-type", colSpan: 2, rowSpan: 1 },
  ],
  [
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "normal", colSpan: 1, rowSpan: 1 },
    { label: "enhanced", colSpan: 1, rowSpan: 1 },
    { label: "normal", colSpan: 1, rowSpan: 1 },
    { label: "enhanced", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "dataset", colSpan: 1, rowSpan: 2 },
    { label: "biotable", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
  ],
  [
    { label: "wt250", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
    { label: "", colSpan: 1, rowSpan: 1 },
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
