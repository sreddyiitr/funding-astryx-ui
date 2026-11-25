import {useState} from 'react';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Badge} from '@astryxdesign/core/Badge';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Selector} from '@astryxdesign/core/Selector';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import type {ActivityEvent, FundingTask, FundingTaskStatus} from '../lib/api';
import {TASK_CATEGORY, TASK_STATUS} from '../lib/domain';
import {ActivityTimeline} from './ActivityTimeline';

const CLEARED: FundingTaskStatus[] = ['VERIFIED', 'WAIVED'];
// Open work first, then cleared, so the funder sees what blocks funding.
const ORDER: FundingTaskStatus[] = ['DISCREPANCY_FLAGGED', 'PENDING_REVIEW', 'EXPIRED', 'VERIFIED', 'WAIVED'];

const STATUS_OPTIONS = (Object.keys(TASK_STATUS) as FundingTaskStatus[]).map(s => ({
  value: s,
  label: TASK_STATUS[s].label,
  icon: <StatusDot variant={TASK_STATUS[s].dot} label={TASK_STATUS[s].label} />,
}));

export function Tasks({
  tasks,
  activity,
  onChangeStatus,
}: {
  tasks: FundingTask[];
  activity: ActivityEvent[];
  onChangeStatus: (task: FundingTask, status: FundingTaskStatus) => Promise<void>;
}) {
  const [view, setView] = useState<'open' | 'all'>('all');
  const cleared = tasks.filter(t => CLEARED.includes(t.status)).length;
  const shown = [...tasks]
    .filter(t => view === 'all' || !CLEARED.includes(t.status))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <VStack gap={4}>
      <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
        <Heading level={2}>Funding tasks</Heading>
        <SegmentedControl label="Show tasks" value={view} onChange={v => setView(v as 'open' | 'all')} size="sm">
          <SegmentedControlItem value="all" label={`All (${tasks.length})`} />
          <SegmentedControlItem value="open" label={`Open (${tasks.length - cleared})`} />
        </SegmentedControl>
      </HStack>

      {tasks.length > 0 && (
        <HStack gap={3} vAlign="center">
          <Text type="supporting" color="secondary">
            {cleared} of {tasks.length} cleared
          </Text>
          <StackItem size="fill">
            <ProgressBar
              label="Tasks cleared"
              isLabelHidden
              value={(cleared / tasks.length) * 100}
              variant={cleared === tasks.length ? 'success' : 'accent'}
            />
          </StackItem>
        </HStack>
      )}

      {shown.length === 0 ? (
        <Card variant="muted">
          <EmptyState
            title={tasks.length === 0 ? 'No funding tasks' : 'All tasks cleared'}
            description={
              tasks.length === 0 ? 'This application has no funding tasks.' : 'Every task is verified or waived.'
            }
            isCompact
          />
        </Card>
      ) : (
        <VStack gap={3}>
          {shown.map(task => (
            <TaskCard
              key={task.taskId}
              task={task}
              events={activity.filter(e => e.taskId === task.taskId)}
              onChangeStatus={onChangeStatus}
            />
          ))}
        </VStack>
      )}
    </VStack>
  );
}

function TaskCard({
  task,
  events,
  onChangeStatus,
}: {
  task: FundingTask;
  events: ActivityEvent[];
  onChangeStatus: (task: FundingTask, status: FundingTaskStatus) => Promise<void>;
}) {
  const status = TASK_STATUS[task.status];
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
          <StackItem size="fill">
            <VStack gap={2}>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Badge variant="neutral" label={TASK_CATEGORY[task.category]} />
                <Badge variant={status.badge} label={status.label} />
              </HStack>
              <Heading level={3}>{task.title}</Heading>
              <Text type="body" color="secondary">
                {task.description}
              </Text>
              <Text type="supporting" color="secondary">
                {task.verifiedBy ? `Verified by ${task.verifiedBy} · ` : ''}Updated{' '}
                <Timestamp value={task.updatedAt} format="relative" />
              </Text>
            </VStack>
          </StackItem>
          <Selector
            label={`Status for ${task.title}`}
            isLabelHidden
            variant="secondary"
            size="sm"
            options={STATUS_OPTIONS}
            value={task.status}
            changeAction={async value => {
              if (value && value !== task.status) await onChangeStatus(task, value as FundingTaskStatus);
            }}
          />
        </HStack>
        <Collapsible
          defaultIsOpen={task.status === 'DISCREPANCY_FLAGGED'}
          chevronPosition="start"
          trigger={
            <Text type="label" color="secondary">
              Activity ({events.length})
            </Text>
          }>
          <VStack gap={0} paddingBlockStart={3}>
            <ActivityTimeline events={events} emptyText="No activity on this task yet." />
          </VStack>
        </Collapsible>
      </VStack>
    </Card>
  );
}
