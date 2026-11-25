import {useState} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Grid, GridSpan} from '@astryxdesign/core/Grid';
import {Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Skeleton} from '@astryxdesign/core/Skeleton';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {TextArea} from '@astryxdesign/core/TextArea';
import {useToast} from '@astryxdesign/core/Toast';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
  addNote,
  fetchApplication,
  updateApplicationStatus,
  updateTaskStatus,
  type ActivityEvent,
  type FundingTask,
} from '../lib/api';
import {APP_STATUS, TASK_STATUS} from '../lib/domain';
import {useAsync} from '../lib/hooks';
import {Hero} from './Hero';
import {Tasks} from './Tasks';
import {ActivityTimeline} from './ActivityTimeline';

export function ApplicationView({
  applicationId,
  actor,
  onChanged,
}: {
  applicationId: string;
  actor: string | null;
  /** Called after a mutation so the queue can refresh (status may have moved). */
  onChanged: () => void;
}) {
  const showToast = useToast();
  const isWide = useMediaQuery('(min-width: 1440px)', false);
  const detail = useAsync(() => fetchApplication(applicationId), [applicationId]);

  const requireActor = () => {
    if (!actor) throw new Error('Choose who you are acting as (top right) before making changes.');
    return actor;
  };

  const run = async (work: () => Promise<void>, success: string) => {
    try {
      await work();
      showToast({body: success});
      detail.reload();
      onChanged();
    } catch (e) {
      showToast({body: (e as Error).message, type: 'error'});
    }
  };

  if (detail.status === 'error' && !detail.data) {
    return (
      <Banner
        status="error"
        title={`Couldn't load ${applicationId}`}
        description={detail.error.message}
        endContent={<Button label="Retry" size="sm" onClick={detail.reload} />}
      />
    );
  }
  if (!detail.data) {
    if (detail.status === 'ready') {
      return (
        <EmptyState
          title="Application not found"
          description={`No application with ID "${applicationId}".`}
        />
      );
    }
    return (
      <VStack gap={6}>
        <Skeleton height={260} />
        <Skeleton height={160} index={1} />
        <Skeleton height={160} index={2} />
      </VStack>
    );
  }

  const app = detail.data;
  const appEvents = app.activity.filter(e => !e.taskId);

  const tasks = (
    <Tasks
      tasks={app.tasks}
      activity={app.activity}
      onChangeStatus={(task: FundingTask, status) =>
        run(
          () => updateTaskStatus({taskId: task.taskId, status, actor: requireActor()}),
          `${task.title}: ${TASK_STATUS[status].label}`,
        )
      }
    />
  );
  const activity = (
    <AppActivity
      events={appEvents}
      onAddNote={text =>
        run(() => addNote({applicationId: app.applicationId, actor: requireActor(), details: text}), 'Note added')
      }
    />
  );

  return (
    <VStack gap={8}>
      {detail.status === 'error' && (
        <Banner status="warning" title="Showing the last loaded data" description={detail.error.message} />
      )}
      <Hero
        app={app}
        isRefreshing={detail.status === 'loading'}
        onRefresh={detail.reload}
        onChangeStatus={status =>
          run(
            () => updateApplicationStatus({applicationId: app.applicationId, status, actor: requireActor()}),
            `Application moved to ${APP_STATUS[status].label}`,
          )
        }
      />
      {isWide ? (
        <Grid columns={3} gap={6} align="start">
          <GridSpan columns={2}>{tasks}</GridSpan>
          {activity}
        </Grid>
      ) : (
        <>
          {tasks}
          {activity}
        </>
      )}
    </VStack>
  );
}

function AppActivity({events, onAddNote}: {events: ActivityEvent[]; onAddNote: (text: string) => Promise<void>}) {
  const [note, setNote] = useState('');
  return (
    <VStack gap={4}>
      <Heading level={2}>Application activity</Heading>
      <Card padding={5}>
        <VStack gap={5}>
          <VStack gap={2} hAlign="stretch">
            <TextArea
              label="Add a note"
              isLabelHidden
              placeholder="Add a note for the file…"
              value={note}
              onChange={setNote}
              rows={3}
              width="100%"
            />
            <HStack gap={2} hAlign="end">
              <Button
                label="Add note"
                variant="primary"
                size="sm"
                isDisabled={note.trim() === ''}
                clickAction={async () => {
                  await onAddNote(note.trim());
                  setNote('');
                }}
              />
            </HStack>
          </VStack>
          <ActivityTimeline events={events} emptyText="No application-level activity yet." />
        </VStack>
      </Card>
    </VStack>
  );
}
