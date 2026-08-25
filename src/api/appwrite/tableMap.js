/** Entity class name (Base44) → Appwrite table id */
export const TABLE_MAP = {
  Agency: 'agencies',
  Client: 'clients',
  Service: 'services',
  Task: 'tasks',
  CyclePlan: 'cycle_plans',
  Brief: 'briefs',
  BriefingTemplate: 'briefing_templates',
  ApprovalRequest: 'approval_requests',
  Invite: 'invites',
  Profile: 'profiles',
};

export const PHASE1_TABLES = Object.values(TABLE_MAP);

/** Indexed / typed columns per table. Everything else goes into `payload` JSON. */
export const TABLE_COLUMNS = {
  profiles: ['agencyId', 'role', 'clientId', 'name', 'email', 'full_name', 'status'],
  agencies: ['agencyName', 'name', 'contactPhone', 'ownerEmail', 'status'],
  clients: ['agencyId', 'name', 'status', 'email', 'phone'],
  services: ['agencyId', 'clientId', 'name', 'status', 'is_template', 'is_active', 'category'],
  tasks: ['agencyId', 'clientId', 'serviceId', 'title', 'status', 'priority', 'dueDate', 'assigneeId'],
  cycle_plans: ['agencyId', 'clientId', 'serviceId', 'status', 'title'],
  briefs: ['agencyId', 'clientId', 'projectId', 'status', 'title'],
  briefing_templates: ['agencyId', 'name', 'isActive'],
  approval_requests: ['agencyId', 'clientId', 'status', 'token'],
  invites: ['agencyId', 'email', 'role', 'status'],
};

export const BOOLEAN_COLUMNS = new Set([
  'is_template',
  'is_active',
  'isActive',
]);

export const DATETIME_COLUMNS = new Set(['dueDate']);
