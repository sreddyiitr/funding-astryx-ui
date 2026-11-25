import {useEffect, useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {Layout, LayoutContent, LayoutPanel} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Avatar} from '@astryxdesign/core/Avatar';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {Landmark, MousePointerClick} from 'lucide-react';
import {fetchActors, type FundingTaskCategory, type FundingTaskStatus} from './lib/api';
import {APP_STATUS, TASK_CATEGORY, TASK_STATUS} from './lib/domain';
import {useAsync, useLocalStorage, useUrlParam, useUrlState} from './lib/hooks';
import {DEFAULT_FILTERS, Queue, type QueueFilters} from './components/Queue';
import {ApplicationView} from './components/ApplicationView';

// Queue filters live in the URL: ?q=…&view=…&task=…&taskStatus=…
const URL_DEFAULTS = {q: '', view: DEFAULT_FILTERS.scope, task: null, taskStatus: null} as {
  q: string | null;
  view: string | null;
  task: string | null;
  taskStatus: string | null;
};
const VIEWS = new Set(['open', 'not_funded', 'all', ...Object.keys(APP_STATUS)]);

/** Ignores unknown values so a hand-edited link can't send an invalid enum to the API. */
function fromUrl(u: typeof URL_DEFAULTS): QueueFilters {
  return {
    search: u.q ?? '',
    scope: u.view && VIEWS.has(u.view) ? u.view : DEFAULT_FILTERS.scope,
    taskCategory: u.task && u.task in TASK_CATEGORY ? (u.task as FundingTaskCategory) : null,
    taskStatus: u.taskStatus && u.taskStatus in TASK_STATUS ? (u.taskStatus as FundingTaskStatus) : null,
  };
}

function toUrl(f: QueueFilters): typeof URL_DEFAULTS {
  return {q: f.search, view: f.scope, task: f.taskCategory, taskStatus: f.taskStatus};
}

export default function App() {
  const [selectedId, setSelectedId] = useUrlParam('app');
  const [urlFilters, setUrlFilters] = useUrlState(URL_DEFAULTS);
  const filters = fromUrl(urlFilters);
  const setFilters = (patch: Partial<QueueFilters>) => setUrlFilters(toUrl({...filters, ...patch}));
  const [queueRefresh, setQueueRefresh] = useState(0);
  const [actor, setActor] = useLocalStorage('funding.actor');
  const actors = useAsync(fetchActors, []);

  // Default to the first funder so mutations work out of the box.
  useEffect(() => {
    if (!actor && actors.data?.length) {
      const funder = actors.data.find(a => a.role === 'FUNDER') ?? actors.data[0];
      setActor(funder.actorName);
    }
  }, [actor, actors.data, setActor]);

  const actorOptions = (actors.data ?? []).map(a => ({
    value: a.actorName,
    label: a.actorName,
    description: a.role.replace('_', ' ').toLowerCase(),
    icon: <Avatar name={a.actorName} size="xsm" tooltip={false} />,
  }));

  return (
    <AppShell
      variant="elevated"
      topNav={
        <TopNav
          heading={
            <TopNavHeading
              logo={<Icon icon={Landmark} color="accent" />}
              heading="Funding Backoffice"
              subheading="Auto loan funding"
            />
          }
          endContent={
            <Selector
              label="Acting as"
              isLabelHidden
              variant="ghost"
              placeholder="Acting as…"
              options={actorOptions}
              value={actor ?? undefined}
              onChange={value => value && setActor(value)}
              isLoading={actors.status === 'loading'}
              hasSearch={actorOptions.length > 8}
            />
          }
        />
      }>
      <Layout
        height="fill"
        start={
          <LayoutPanel width={400} padding={0} hasDivider label="Funding queue">
            <Queue
              filters={filters}
              onFiltersChange={setFilters}
              selectedId={selectedId}
              onSelect={setSelectedId}
              refreshKey={queueRefresh}
            />
          </LayoutPanel>
        }
        content={
          <LayoutContent padding={8} role="main" label="Application">
            {selectedId ? (
              <ApplicationView
                key={selectedId}
                applicationId={selectedId}
                actor={actor}
                onChanged={() => setQueueRefresh(n => n + 1)}
              />
            ) : (
              <EmptyState
                icon={<Icon icon={MousePointerClick} size="lg" color="secondary" />}
                title="Select an application"
                description="Pick an application from the queue, or search by application ID or deal number."
                headingLevel={1}
              />
            )}
          </LayoutContent>
        }
      />
    </AppShell>
  );
}
