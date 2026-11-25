// Thin GraphQL client + typed queries for funding-graphql (see its schema.graphqls).

export type ApplicationFundingStatus =
  | 'READY_TO_FUND'
  | 'PENDING_STIPULATIONS'
  | 'PENDING_AGENT_VERIFICATION'
  | 'EXCEPTION_HOLD'
  | 'FUNDED'
  | 'EXPIRED'
  | 'DECLINED'
  | 'WITHDRAWN';

export type FundingTaskStatus =
  | 'VERIFIED'
  | 'PENDING_REVIEW'
  | 'DISCREPANCY_FLAGGED'
  | 'WAIVED'
  | 'EXPIRED';

export type FundingTaskCategory =
  | 'VIN_VERIFICATION'
  | 'GAP_FORM_VERIFICATION'
  | 'INCOME_VERIFICATION'
  | 'TITLE_AND_LIEN'
  | 'TILA_RECONCILIATION'
  | 'INSURANCE_BINDER'
  | 'OTHER';

export type ActorRole = 'FUNDER' | 'SYSTEM' | 'DEALER_FI' | 'UNDERWRITER';

export type ApplicationSummary = {
  applicationId: string;
  dealNumber: string;
  dealerNameSnapshot: string;
  stateCode: string;
  submittedAt: string;
  slaMinutesRemaining: number;
  status: ApplicationFundingStatus;
  applicant: {fullName: string} | null;
};

export type FundingTask = {
  taskId: string;
  category: FundingTaskCategory;
  title: string;
  description: string;
  status: FundingTaskStatus;
  verifiedBy: string | null;
  updatedAt: string;
};

export type ActivityEvent = {
  eventId: string;
  occurredAt: string;
  taskId: string | null;
  actor: string;
  role: ActorRole;
  action: string;
  details: string | null;
};

export type ApplicationDetail = ApplicationSummary & {
  dealerId: string;
  slaCutoffAt: string | null;
  expiresAt: string | null;
  fundedAt: string | null;
  updatedAt: string;
  dealer: {legalName: string; dbaName: string | null} | null;
  applicant: {
    fullName: string;
    coApplicantName: string | null;
    ficoScore: number | null;
    statedMonthlyIncome: string;
    verifiedMonthlyIncome: string | null;
  } | null;
  vehicle: {
    modelYear: number;
    make: string;
    model: string;
    trim: string | null;
    vin: string;
    mileage: number;
    condition: 'NEW' | 'USED' | 'CPO';
  } | null;
  loanTerms: {
    amountFinanced: string;
    apr: string;
    termMonths: number;
    monthlyPayment: string;
    ltvPercent: string | null;
    dtiPercent: string | null;
  } | null;
  tasks: FundingTask[];
  activity: ActivityEvent[];
};

export type Actor = {actorName: string; role: ActorRole};

export type ApplicationFilters = {
  search?: string;
  statuses?: ApplicationFundingStatus[];
  taskCategory?: FundingTaskCategory;
  taskStatus?: FundingTaskStatus;
};

export class GraphQLError extends Error {}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({query, variables}),
  });
  if (!res.ok) {
    throw new GraphQLError(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as {data?: T; errors?: {message: string}[]};
  if (body.errors?.length) {
    throw new GraphQLError(body.errors.map(e => e.message).join('; '));
  }
  return body.data as T;
}

const SUMMARY_FIELDS = `
  applicationId dealNumber dealerNameSnapshot stateCode submittedAt
  slaMinutesRemaining status
  applicant { fullName }
`;

const TASK_FIELDS = `taskId category title description status verifiedBy updatedAt`;
const EVENT_FIELDS = `eventId occurredAt taskId actor role action details`;

export const PAGE_SIZE = 25;

/** Fetches one page; asks for one extra row to know whether a next page exists. */
export async function fetchApplications(
  filters: ApplicationFilters,
  offset: number,
): Promise<{items: ApplicationSummary[]; hasMore: boolean}> {
  const data = await gql<{applications: ApplicationSummary[]}>(
    `query Applications($statuses: [ApplicationFundingStatus!], $search: String,
                        $taskCategory: FundingTaskCategory, $taskStatus: FundingTaskStatus,
                        $limit: Int, $offset: Int) {
       applications(statuses: $statuses, search: $search, taskCategory: $taskCategory,
                     taskStatus: $taskStatus, limit: $limit, offset: $offset) { ${SUMMARY_FIELDS} }
     }`,
    {
      statuses: filters.statuses?.length ? filters.statuses : null,
      search: filters.search?.trim() || null,
      taskCategory: filters.taskCategory ?? null,
      taskStatus: filters.taskStatus ?? null,
      limit: PAGE_SIZE + 1,
      offset,
    },
  );
  return {
    items: data.applications.slice(0, PAGE_SIZE),
    hasMore: data.applications.length > PAGE_SIZE,
  };
}

export async function fetchApplication(applicationId: string): Promise<ApplicationDetail | null> {
  const data = await gql<{application: ApplicationDetail | null}>(
    `query Application($id: String!) {
       application(applicationId: $id) {
         ${SUMMARY_FIELDS}
         dealerId slaCutoffAt expiresAt fundedAt updatedAt
         dealer { legalName dbaName }
         applicant { fullName coApplicantName ficoScore statedMonthlyIncome verifiedMonthlyIncome }
         vehicle { modelYear make model trim vin mileage condition }
         loanTerms { amountFinanced apr termMonths monthlyPayment ltvPercent dtiPercent }
         tasks { ${TASK_FIELDS} }
         activity(limit: 200) { ${EVENT_FIELDS} }
       }
     }`,
    {id: applicationId},
  );
  return data.application;
}

export async function fetchActors(): Promise<Actor[]> {
  const data = await gql<{actors: Actor[]}>(`{ actors { actorName role } }`);
  return data.actors;
}

export async function updateTaskStatus(input: {
  taskId: string;
  status: FundingTaskStatus;
  actor: string;
  details?: string;
}): Promise<void> {
  await gql(
    `mutation UpdateTask($input: UpdateFundingTaskStatusInput!) {
       updateFundingTaskStatus(input: $input) { taskId status }
     }`,
    {input},
  );
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  status: ApplicationFundingStatus;
  actor: string;
  details?: string;
}): Promise<void> {
  await gql(
    `mutation UpdateApp($input: UpdateApplicationStatusInput!) {
       updateApplicationStatus(input: $input) { applicationId status }
     }`,
    {input},
  );
}

export async function addNote(input: {
  applicationId: string;
  taskId?: string;
  actor: string;
  details: string;
}): Promise<void> {
  await gql(
    `mutation AddNote($input: AddActivityEventInput!) {
       addActivityEvent(input: $input) { eventId }
     }`,
    {input: {...input, action: 'NOTE_ADDED'}},
  );
}
