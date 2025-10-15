export const showNotingCanBeExportToast = () => {
  ElMessage({
    message: 'Nothing can be exported',
    type: 'info',
    grouping: true,
  });
};

export interface BatchFilesResult {
  success?: number;
  skip?: number;
  error?: number;
}

export const showBatchFilesResultMessage = (
  action: string,
  { success = 0, skip = 0, error = 0 }: BatchFilesResult = {},
) => {
  const parts: string[] = [`${action} ${success} file${success > 1 ? 's' : ''}`];
  if (skip) parts.push(`skipped ${skip}`);
  if (error) parts.push(`failed ${error}`);
  ElMessage({
    message: parts.join(', '),
    type: success ? 'success' : skip ? 'warning' : error ? 'error' : 'info',
  });
};
