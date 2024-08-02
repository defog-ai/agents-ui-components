const config = {
  token: "The hashed password.",
  user: 'User email/name. Default is "admin".',
  apiEndpoint:
    "The API endpoint to use for the requests. Default is https://demo.defog.ai.",
  devMode: " If the component should be in dev mode.",
  showAnalysisUnderstanding:
    'Whether to show "analysis understanding" aka description of the results created by a model under the table.',
  showCode: "Whether to show tool code.",
  allowDashboardAdd: "Whether to allow addition to dashboards.",
  sqliteConn: "The sqlite connection object",
  disableMessages: "Whether to disable messages",
  onSetupComplete: "The function to run after the setup is complete.",
  loaderRootClassNames: "The class names for the loader.",
  children: "The children to render.",
};

import { Table } from "../../lib/components/core-ui/Table";

export function ConfigTable() {
  const rows = Object.entries(config).map(([key, value]) => ({ key, value }));

  return (
    <Table
      rootClassNames="overflow-hidden"
      rows={rows}
      columns={[
        { dataIndex: "key", title: "Key" },
        { dataIndex: "value", title: "Description" },
      ]}
      pagination={{ showSizeChanger: false, defaultPageSize: 20 }}
    />
  );
}

export default {
  title: "Agents/Config",
  component: ConfigTable,
  parameters: {
    layout: "fullscreen",
    actions: {
      handles: ["click"],
    },
  },
  tags: ["autodocs"],
  argTypes: {},
};
