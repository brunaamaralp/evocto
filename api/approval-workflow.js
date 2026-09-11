/**
 * API Approval Workflow.
 * ?action=create|notify|validate|process
 */
import approvalWorkflowHandler from '../lib/server/approvalWorkflowHandler.js';

export const config = {
  maxDuration: 30,
  api: {
    bodyParser: {
      sizeLimit: '512kb',
    },
  },
};

export default approvalWorkflowHandler;
