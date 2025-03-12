declare interface DefaultResponse {
  success?: boolean;
  error_message?: string;
  [key: string]: any;
}

declare interface ColumnMetadata {
  column_name: string;
  data_type: string;
  column_description: string;
  table_name: string;
}

declare type QuestionType = "analysis" | "follow-on-analysis" | "edit-chart";

declare type PreviousContextItem = {
  question: string;
  sql: string;
};

declare type PreviousContext = PreviousContextItem[] | null;

declare interface EditedInputs {
  question: string;
  sql: string;
  hard_filters: string[];
}

declare type ProjectDbType =
  | "postgres"
  | "redshift"
  | "snowflake"
  | "databricks"
  | "bigquery"
  | "sqlserver";

declare interface ProjectDbCreds {
  postgres: {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
  };
  redshift: {
    host: string;
    port: string;
    user: string;
    password: string;
    database: string;
    schema: string;
  };
  snowflake: {
    account: string;
    warehouse: string;
    user: string;
    password: string;
  };
  databricks: {
    server_hostname: string;
    access_token: string;
    http_path: string;
    schema: string;
  };
  bigquery: {
    credentials_file_content: string;
  };
  sqlserver: {
    server: string;
    database: string;
    user: string;
    password: string;
  };
}

declare type DbMetadata = Array<{
  table_name: string;
  column_name: string;
  data_type: string;
  column_description: string;
}>;

declare interface ProjectDbInfo {
  db_name?: string;
  db_type?: ProjectDbType;
  db_creds?: ProjectDbCreds[ProjectDbType];
  can_connect?: boolean;
  metadata?: DbMetadata;
  selected_tables?: string[];
  tables?: string[];
}
