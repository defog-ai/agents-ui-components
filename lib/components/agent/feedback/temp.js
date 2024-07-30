export const tempSuggestion = {
  success: true,
  did_overwrite: false,
  suggested_improvements:
    'The identified issue with the original plan is that the `data_fetcher_and_aggregator` tool is used to fetch data from an external database, but the question "Fetch 5 random rows from the dataset" is too vague and does not specify the table from which to fetch the data. Given the database schema provided, it is clear that the data should be fetched from the `etf_prices` table. However, the tool\'s instructions specify not to mention the table name directly in the question. Therefore, the question needs to be rephrased to implicitly target the correct table without explicitly naming it.\n\nHere is the updated plan:\n\n```yaml\n- done: true\n  error_message: null\n  model_generated_inputs:\n    question: Fetch 5 random rows from the ETF prices data\n  outputs_storage_keys:\n  - random_rows\n  tool_name: data_fetcher_and_aggregator\n```\n\nThis revised plan addresses the issue by specifying "ETF prices data," which implicitly targets the `etf_prices` table without directly naming it, adhering to the tool\'s usage guidelines.',
  recommended_plan: [
    {
      done: true,
      error_message: null,
      model_generated_inputs: {
        question: "Fetch 5 random rows from the ETF prices data",
      },
      outputs_storage_keys: ["random_rows"],
      tool_name: "data_fetcher_and_aggregator",
      tool_run_id: "cf30689a-6a0e-42b7-9f4c-1b792899ffcd",
      inputs: {
        question: "Fetch 5 random rows from the ETF prices data",
      },
    },
  ],
  new_analysis_id: "767a6aaf-3654-446b-9b29-7102bf473b55",
  new_analysis_data: {
    user_question: "show me 5 random rows",
    timestamp: "2024-05-22 18:57:47.875329",
    report_id: "767a6aaf-3654-446b-9b29-7102bf473b55",
    api_key: "chinook",
    username: "admin",
    gen_steps: [
      {
        done: true,
        error_message: null,
        model_generated_inputs: {
          question: "Fetch 5 random rows from the ETF prices data",
        },
        outputs_storage_keys: ["random_rows"],
        tool_name: "data_fetcher_and_aggregator",
        tool_run_id: "cf30689a-6a0e-42b7-9f4c-1b792899ffcd",
        inputs: {
          question: "Fetch 5 random rows from the ETF prices data",
        },
      },
    ],
    clarify: [],
  },
};

// d = [
//   {
//     done: False,
//     error_message: None,
//     model_generated_inputs: { question: "Fetch 5 rows from the database" },
//     outputs_storage_keys: ["sample_data"],
//     tool_name: "data_fetcher_and_aggregator",
//     tool_run_id: "ff3256ac-52eb-4c95-b6d0-b1df1d2924d5",
//     inputs: { question: "Fetch 5 rows from the database" },
//     function_signature: {
//       question: {
//         name: "question",
//         type: "str",
//         default: None,
//         description:
//           "natural language description of the data required to answer this question (or get the required information for subsequent steps) as a string",
//       },
//     },
//   },
//   {
//     done: True,
//     error_message: None,
//     model_generated_inputs: {
//       full_data: "global_dict.sample_data",
//       boxplot_cols: ["price_date", "close"],
//       facet: False,
//       color: "#0057CF",
//       opacity: 0.5,
//     },
//     outputs_storage_keys: ["boxplot_output_0"],
//     tool_name: "boxplot",
//     tool_run_id: "3ed24715-64be-46d0-8c7d-31c3b22b0500",
//     inputs: {
//       full_data: "global_dict.sample_data",
//       boxplot_cols: ["price_date", "close"],
//       facet: False,
//       color: "#0057CF",
//       opacity: 0.5,
//     },
//     function_signature: {
//       full_data: {
//         name: "full_data",
//         type: "pandas.core.frame.DataFrame",
//         default: None,
//         description: '"global_dict.<input_df_name>"',
//       },
//       boxplot_cols: {
//         name: "boxplot_cols",
//         type: "DBColumnList_1_2",
//         default: None,
//         description: "Array of boxplot x column and boxplot y column",
//       },
//       facet: {
//         name: "facet",
//         type: "bool",
//         default: False,
//         description: "True if the user wants to facet the boxplot else False",
//       },
//       facet_col: {
//         name: "facet_col",
//         type: "DBColumn",
//         default: None,
//         description: "column name to use for faceting or None",
//       },
//       color: {
//         name: "color",
//         type: "DropdownSingleSelect",
//         default: [
//           "#000000",
//           "#009D94",
//           "#0057CF",
//           "#FFBD00",
//           "#FF5C1C",
//           "#691A6B",
//         ],
//         description: "color to use for the boxplot",
//       },
//       opacity: {
//         name: "opacity",
//         type: "DropdownSingleSelect",
//         default: [0.1, 0.2, 0.3, 0.4, 0.5],
//         description: "numerical value between 0 and 1",
//       },
//     },
//   },
// ];
