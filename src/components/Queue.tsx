import {useEffect, useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {colorVars} from '@astryxdesign/core/theme/tokens.stylex';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Badge} from '@astryxdesign/core/Badge';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Banner} from '@astryxdesign/core/Banner';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import {Divider} from '@astryxdesign/core/Divider';
import {
  fetchApplications,
  PAGE_SIZE,
  type ApplicationFundingStatus,
  type ApplicationSummary,
  type FundingTaskCategory,
  type FundingTaskStatus,
} from '../lib/api';
import {
  ALL_APP_STATUSES,
  APP_STATUS,
  NOT_FUNDED_STATUSES,
  OPEN_STATUSES,
  TASK_CATEGORY,
  TASK_STATUS,
  slaText,
  slaVariant,
} from '../lib/domain';
import {useAsync, useDebounced} from '../lib/hooks';

const styles = stylex.create({
  selected: {
    backgroundColor: colorVars['--color-accent-muted'],
    borderColor: colorVars['--color-accent'],
  },
});

export type QueueFilters = {
  search: string;
  /** 'open' | 'not_funded' | 'all' | a single ApplicationFundingStatus */
  scope: string;
  taskCategory: FundingTaskCategory | null;
  taskStatus: FundingTaskStatus | null;
};

export const DEFAULT_FILTERS: QueueFilters = {
  search: '',
  scope: 'open',
  taskCategory: null,
  taskStatus: null,
};

const SCOPE_OPTIONS = [
  {
    type: 'section' as const,
    title: 'Views',
    options: [
      {value: 'open', label: 'Needs action', description: 'Ready, pending or on hold'},
      {value: 'not_funded', label: 'All not funded'},
      {value: 'all', label: 'All statuses'},
    ],
  },
  {
    type: 'section' as const,
    title: 'Status',
    options: ALL_APP_STATUSES.map(s => ({
      value: s,
      label: APP_STATUS[s].label,
      icon: <StatusDot variant={APP_STATUS[s].dot} label={APP_STATUS[s].label} />,
    })),
  },
];

const CATEGORY_OPTIONS = (Object.keys(TASK_CATEGORY) as FundingTaskCategory[]).map(c => ({
  value: c,
  label: TASK_CATEGORY[c],
}));

const TASK_STATUS_OPTIONS = (Object.keys(TASK_STATUS) as FundingTaskStatus[]).map(s => ({
  value: s,
  label: TASK_STATUS[s].label,
  icon: <StatusDot variant={TASK_STATUS[s].dot} label={TASK_STATUS[s].label} />,
}));

function statusesFor(scope: string): ApplicationFundingStatus[] | undefined {
  if (scope === 'open') return OPEN_STATUSES;
  if (scope === 'not_funded') return NOT_FUNDED_STATUSES;
  if (scope === 'all') return undefined;
  return [scope as ApplicationFundingStatus];
}

export function Queue({
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  refreshKey,
}: {
  filters: QueueFilters;
  onFiltersChange: (patch: Partial<QueueFilters>) => void;
  selectedId: string | null;
  onSelect: (applicationId: string) => void;
  refreshKey: number;
}) {
  const search = useDebounced(filters.search, 300);
  const [pages, setPages] = useState(1);
  const filterKey = JSON.stringify([search, filters.scope, filters.taskCategory, filters.taskStatus]);

  // New filters start again from the first page.
  useEffect(() => setPages(1), [filterKey]);

  const result = useAsync(async () => {
    const query = {
      search,
      statuses: statusesFor(filters.scope),
      taskCategory: filters.taskCategory ?? undefined,
      taskStatus: filters.taskStatus ?? undefined,
    };
    const all: ApplicationSummary[] = [];
    let hasMore = false;
    for (let page = 0; page < pages; page++) {
      const res = await fetchApplications(query, page * PAGE_SIZE);
      all.push(...res.items);
      hasMore = res.hasMore;
      if (!hasMore) break;
    }
    return {items: all, hasMore};
  }, [filterKey, pages, refreshKey]);

  const hasActiveFilters =
    filters.search !== '' ||
    filters.scope !== DEFAULT_FILTERS.scope ||
    filters.taskCategory !== null ||
    filters.taskStatus !== null;

  return (
    <VStack gap={4} padding={4}>
      <HStack gap={2} vAlign="center" hAlign="between">
        <Heading level={2}>Funding queue</Heading>
        {hasActiveFilters && (
          <Button label="Reset" variant="ghost" size="sm" onClick={() => onFiltersChange(DEFAULT_FILTERS)} />
        )}
      </HStack>

      <VStack gap={3}>
        <TextInput
          label="Application or deal number"
          isLabelHidden
          type="search"
          startIcon="search"
          placeholder="Search application ID or deal #"
          value={filters.search}
          onChange={value => onFiltersChange({search: value})}
          hasClear
          width="100%"
        />
        <Selector
          label="Status"
          options={SCOPE_OPTIONS}
          value={filters.scope}
          onChange={value => onFiltersChange({scope: value ?? DEFAULT_FILTERS.scope})}
          width="100%"
        />
        <HStack gap={2}>
          <StackItem size="fill">
            <Selector
              label="Task type"
              placeholder="Any task"
              options={CATEGORY_OPTIONS}
              value={filters.taskCategory}
              onChange={value => onFiltersChange({taskCategory: value as FundingTaskCategory | null})}
              hasClear
              width="100%"
            />
          </StackItem>
          <StackItem size="fill">
            <Selector
              label="Task status"
              placeholder="Any status"
              options={TASK_STATUS_OPTIONS}
              value={filters.taskStatus}
              onChange={value => onFiltersChange({taskStatus: value as FundingTaskStatus | null})}
              hasClear
              width="100%"
            />
          </StackItem>
        </HStack>
      </VStack>

      <Divider />

      {result.status === 'error' && (
        <Banner
          status="error"
          title="Couldn't load applications"
          description={result.error.message}
          endContent={<Button label="Retry" size="sm" onClick={result.reload} />}
        />
      )}

      {result.data == null && result.status === 'loading' ? (
        <VStack gap={2}>
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} height={84} index={i} />
          ))}
        </VStack>
      ) : result.data && result.data.items.length === 0 ? (
        <EmptyState
          title="No applications match"
          description="Try a different status view or clear the task filters."
          isCompact
          actions={
            hasActiveFilters ? (
              <Button label="Clear filters" onClick={() => onFiltersChange(DEFAULT_FILTERS)} />
            ) : undefined
          }
        />
      ) : (
        result.data && (
          <VStack gap={2}>
            <Text type="supporting" color="secondary">
              {result.data.items.length}
              {result.data.hasMore ? '+' : ''} application{result.data.items.length === 1 ? '' : 's'}
            </Text>
            {result.data.items.map(app => (
              <QueueCard
                key={app.applicationId}
                app={app}
                isSelected={app.applicationId === selectedId}
                onSelect={onSelect}
              />
            ))}
            {result.data.hasMore && (
              <Button
                label="Load more"
                variant="secondary"
                width="100%"
                isLoading={result.status === 'loading'}
                onClick={() => setPages(p => p + 1)}
              />
            )}
          </VStack>
        )
      )}
    </VStack>
  );
}

function QueueCard({
  app,
  isSelected,
  onSelect,
}: {
  app: ApplicationSummary;
  isSelected: boolean;
  onSelect: (applicationId: string) => void;
}) {
  const status = APP_STATUS[app.status];
  const showSla = app.status !== 'FUNDED' && OPEN_STATUSES.includes(app.status);
  return (
    <ClickableCard
      label={`Open application ${app.applicationId}`}
      onClick={() => onSelect(app.applicationId)}
      padding={3}
      xstyle={isSelected ? styles.selected : undefined}>
      <VStack gap={1}>
        <HStack gap={2} vAlign="center" hAlign="between">
          <Text type="body" weight="semibold" maxLines={1}>
            {app.applicant?.fullName ?? 'Unknown applicant'}
          </Text>
          <Badge variant={status.badge} label={status.label} />
        </HStack>
        <HStack gap={2} vAlign="center">
          <Text type="supporting" color="secondary" hasTabularNumbers>
            {app.applicationId} · {app.dealNumber}
          </Text>
        </HStack>
        <HStack gap={2} vAlign="center" hAlign="between">
          <Text type="supporting" color="secondary" maxLines={1}>
            {app.dealerNameSnapshot} · {app.stateCode}
          </Text>
          {showSla ? (
            <HStack gap={1} vAlign="center">
              <StatusDot variant={slaVariant(app.slaMinutesRemaining)} label="SLA" />
              <Text type="supporting" color="secondary">
                {slaText(app.slaMinutesRemaining)}
              </Text>
            </HStack>
          ) : (
            <Timestamp value={app.submittedAt} format="relative_short" />
          )}
        </HStack>
      </VStack>
    </ClickableCard>
  );
}
