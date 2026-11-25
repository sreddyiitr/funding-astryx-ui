import type {
  ApplicationFundingStatus,
  FundingTaskCategory,
  FundingTaskStatus,
} from './api';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'purple';
type DotVariant = 'success' | 'warning' | 'error' | 'accent' | 'neutral';

type Meta = {label: string; badge: BadgeVariant; dot: DotVariant};

// Status colours never use the accent (indigo) so "selected" and "status" stay distinct.
export const APP_STATUS: Record<ApplicationFundingStatus, Meta> = {
  READY_TO_FUND: {label: 'Ready to fund', badge: 'info', dot: 'accent'},
  PENDING_STIPULATIONS: {label: 'Pending stips', badge: 'warning', dot: 'warning'},
  PENDING_AGENT_VERIFICATION: {label: 'Pending verification', badge: 'warning', dot: 'warning'},
  EXCEPTION_HOLD: {label: 'Exception hold', badge: 'error', dot: 'error'},
  FUNDED: {label: 'Funded', badge: 'success', dot: 'success'},
  EXPIRED: {label: 'Expired', badge: 'neutral', dot: 'neutral'},
  DECLINED: {label: 'Declined', badge: 'neutral', dot: 'neutral'},
  WITHDRAWN: {label: 'Withdrawn', badge: 'neutral', dot: 'neutral'},
};

export const TASK_STATUS: Record<FundingTaskStatus, Meta> = {
  PENDING_REVIEW: {label: 'Pending review', badge: 'warning', dot: 'warning'},
  DISCREPANCY_FLAGGED: {label: 'Discrepancy', badge: 'error', dot: 'error'},
  VERIFIED: {label: 'Verified', badge: 'success', dot: 'success'},
  WAIVED: {label: 'Waived', badge: 'neutral', dot: 'neutral'},
  EXPIRED: {label: 'Expired', badge: 'neutral', dot: 'neutral'},
};

export const TASK_CATEGORY: Record<FundingTaskCategory, string> = {
  VIN_VERIFICATION: 'VIN verification',
  GAP_FORM_VERIFICATION: 'GAP form',
  INCOME_VERIFICATION: 'Income verification',
  TITLE_AND_LIEN: 'Title & lien',
  TILA_RECONCILIATION: 'TILA reconciliation',
  INSURANCE_BINDER: 'Insurance binder',
  OTHER: 'Other',
};

export const ALL_APP_STATUSES = Object.keys(APP_STATUS) as ApplicationFundingStatus[];
export const NOT_FUNDED_STATUSES = ALL_APP_STATUSES.filter(s => s !== 'FUNDED');
/** Statuses a funder still has to act on. */
export const OPEN_STATUSES: ApplicationFundingStatus[] = [
  'READY_TO_FUND',
  'PENDING_STIPULATIONS',
  'PENDING_AGENT_VERIFICATION',
  'EXCEPTION_HOLD',
];

const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
const usd0 = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

export function money(value: string | number | null | undefined, whole = false): string {
  if (value == null) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? (whole ? usd0 : usd).format(n) : '—';
}

export function percent(value: string | number | null | undefined, digits = 2): string {
  if (value == null) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';
}

/** "2h 15m left", "Breached 40m ago" */
export function slaText(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return minutes < 0 ? `Breached ${span} ago` : `${span} left`;
}

export function slaVariant(minutes: number): DotVariant {
  if (minutes < 0) return 'error';
  if (minutes < 120) return 'warning';
  return 'success';
}

/** "TASK_STATUS_CHANGED" -> "Task status changed" */
export function humanize(code: string): string {
  const s = code.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
