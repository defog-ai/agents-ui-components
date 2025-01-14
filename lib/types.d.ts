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

declare type PreviousContext =
  | {
      analysis_id: string;
      user_question: string;
      steps: Step[];
    }[]
  | null;
