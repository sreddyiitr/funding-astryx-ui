import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Badge} from '@astryxdesign/core/Badge';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import type {ActivityEvent, ActorRole} from '../lib/api';
import {humanize} from '../lib/domain';

const ROLE_BADGE: Record<ActorRole, {label: string; variant: 'purple' | 'neutral' | 'blue' | 'teal'}> = {
  FUNDER: {label: 'Funder', variant: 'purple'},
  SYSTEM: {label: 'System', variant: 'neutral'},
  DEALER_FI: {label: 'Dealer F&I', variant: 'blue'},
  UNDERWRITER: {label: 'Underwriter', variant: 'teal'},
};

export function ActivityTimeline({events, emptyText = 'No activity yet.'}: {events: ActivityEvent[]; emptyText?: string}) {
  if (events.length === 0) {
    return (
      <Text type="supporting" color="secondary">
        {emptyText}
      </Text>
    );
  }
  return (
    <VStack gap={4}>
      {events.map(event => {
        const role = ROLE_BADGE[event.role];
        return (
          <HStack key={event.eventId} gap={3} vAlign="start">
            <Avatar name={event.actor} size="sm" />
            <StackItem size="fill">
              <VStack gap={1}>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Text type="body" weight="semibold">
                    {event.actor}
                  </Text>
                  <Badge variant={role.variant} label={role.label} />
                  <StackItem size="fill" />
                  <Timestamp value={event.occurredAt} format="relative" />
                </HStack>
                <Text type="supporting" weight="medium">
                  {humanize(event.action)}
                </Text>
                {event.details && (
                  <Text type="supporting" color="secondary">
                    {event.details}
                  </Text>
                )}
              </VStack>
            </StackItem>
          </HStack>
        );
      })}
    </VStack>
  );
}
