import { SingleSelect } from "@ui-components";

/**
 * Component for selecting a project in the Oracle sidebar
 */
export const OracleProjectSelector = ({
  selectedProjectName,
  projectNames,
  uploadNewProjectOption,
  hasUploadedFiles,
  onProjectChange,
}: {
  selectedProjectName: string;
  projectNames: string[];
  uploadNewProjectOption: string;
  hasUploadedFiles: boolean;
  onProjectChange: (projectName: string) => void;
}) => {
  return (
    <div>
      <SingleSelect
        disabled={hasUploadedFiles}
        label="Select project"
        rootClassNames="mb-2"
        value={selectedProjectName}
        allowClear={false}
        allowCreateNewOption={false}
        options={[
          {
            value: uploadNewProjectOption,
            label: "Upload new",
          },
        ].concat(
          projectNames.map((projectName) => ({
            value: projectName,
            label: projectName,
          }))
        )}
        onChange={(v: string) => onProjectChange(v)}
      />
    </div>
  );
};
