import type {ReactNode} from 'react';
import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Grid} from '@astryxdesign/core/Grid';
import {Badge} from '@astryxdesign/core/Badge';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Selector} from '@astryxdesign/core/Selector';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Timestamp} from '@astryxdesign/core/Timestamp';
import {RefreshCw} from 'lucide-react';
import type {ApplicationDetail, ApplicationFundingStatus} from '../lib/api';
import {ALL_APP_STATUSES, APP_STATUS, OPEN_STATUSES, money, percent, slaText, slaVariant} from '../lib/domain';

const STATUS_OPTIONS = ALL_APP_STATUSES.map(s => ({
  value: s,
  label: APP_STATUS[s].label,
  icon: <StatusDot variant={APP_STATUS[s].dot} label={APP_STATUS[s].label} />,
}));

function Stat({label, value, sub, isCode}: {label: string; value: ReactNode; sub?: ReactNode; isCode?: boolean}) {
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">
          {label}
        </Text>
        {isCode ? (
          <Text type="code" size="base" weight="semibold">
            {value}
          </Text>
        ) : (
          <Text type="large" weight="semibold" maxLines={1} hasTabularNumbers>
            {value}
          </Text>
        )}
        {sub != null && (
          <Text type="supporting" color="secondary" maxLines={1}>
            {sub}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

export function Hero({
  app,
  isRefreshing,
  onRefresh,
  onChangeStatus,
}: {
  app: ApplicationDetail;
  isRefreshing: boolean;
  onRefresh: () => void;
  onChangeStatus: (status: ApplicationFundingStatus) => Promise<void>;
}) {
  const status = APP_STATUS[app.status];
  const {applicant, vehicle, loanTerms: loan, dealer} = app;
  const isOpen = OPEN_STATUSES.includes(app.status);

  return (
    <Card padding={6} elevation="low">
      <VStack gap={6}>
        <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {app.applicationId}
              </Text>
              <Text type="supporting" color="secondary">
                ·
              </Text>
              <Text type="supporting" color="secondary">
                Submitted <Timestamp value={app.submittedAt} format="date_time" />
              </Text>
            </HStack>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Heading level={1}>{applicant?.fullName ?? 'Unknown applicant'}</Heading>
              <Badge variant={status.badge} label={status.label} />
            </HStack>
          </VStack>
          <HStack gap={2} vAlign="center">
            <Selector
              label="Application status"
              isLabelHidden
              variant="secondary"
              options={STATUS_OPTIONS}
              value={app.status}
              changeAction={async value => {
                if (value && value !== app.status) await onChangeStatus(value as ApplicationFundingStatus);
              }}
            />
            <IconButton
              label="Refresh"
              tooltip="Refresh"
              icon={<Icon icon={RefreshCw} size="sm" />}
              isLoading={isRefreshing}
              onClick={onRefresh}
            />
          </HStack>
        </HStack>

        <Grid columns={{minWidth: 190}} gap={3}>
          <Stat
            label="Applicant"
            value={applicant?.fullName ?? '—'}
            sub={applicant?.coApplicantName ? `Co: ${applicant.coApplicantName}` : 'No co-applicant'}
          />
          <Stat label="Deal number" value={app.dealNumber} sub={`State ${app.stateCode}`} />
          <Stat
            label="Dealer"
            value={dealer?.dbaName ?? dealer?.legalName ?? app.dealerNameSnapshot}
            sub={app.dealerId}
          />
          <Stat
            label="Vehicle"
            value={vehicle ? `${vehicle.modelYear} ${vehicle.make}` : '—'}
            sub={
              vehicle
                ? `${[vehicle.model, vehicle.trim].filter(Boolean).join(' ')} · ${vehicle.condition === 'CPO' ? 'CPO' : vehicle.condition.charAt(0) + vehicle.condition.slice(1).toLowerCase()} · ${vehicle.mileage.toLocaleString()} mi`
                : undefined
            }
          />
          <Stat label="VIN" value={vehicle?.vin ?? '—'} isCode sub={vehicle ? `${vehicle.mileage.toLocaleString()} miles` : undefined} />
          <Stat
            label="Amount financed"
            value={money(loan?.amountFinanced)}
            sub={loan?.ltvPercent != null ? `LTV ${percent(loan.ltvPercent, 1)}` : undefined}
          />
          <Stat
            label="APR · Term"
            value={loan ? `${percent(loan.apr)} · ${loan.termMonths} mo` : '—'}
          />
          <Stat
            label="Monthly payment"
            value={money(loan?.monthlyPayment)}
            sub={loan?.dtiPercent != null ? `DTI ${percent(loan.dtiPercent, 1)}` : undefined}
          />
          <Stat
            label="FICO"
            value={applicant?.ficoScore ?? '—'}
            sub={
              applicant
                ? `Income ${money(applicant.verifiedMonthlyIncome ?? applicant.statedMonthlyIncome, true)}/mo ${applicant.verifiedMonthlyIncome ? '(verified)' : '(stated)'}`
                : undefined
            }
          />
          <Stat
            label={app.fundedAt ? 'Funded' : 'SLA'}
            value={
              app.fundedAt ? (
                <Timestamp value={app.fundedAt} format="date" type="inherit" color="inherit" />
              ) : isOpen ? (
                <HStack as="span" gap={2} vAlign="center">
                  <StatusDot variant={slaVariant(app.slaMinutesRemaining)} label="SLA status" />
                  <StackItem>{slaText(app.slaMinutesRemaining)}</StackItem>
                </HStack>
              ) : (
                '—'
              )
            }
            sub={
              app.slaCutoffAt && !app.fundedAt ? (
                <>
                  Cutoff <Timestamp value={app.slaCutoffAt} format="date_time" />
                </>
              ) : undefined
            }
          />
        </Grid>
      </VStack>
    </Card>
  );
}
