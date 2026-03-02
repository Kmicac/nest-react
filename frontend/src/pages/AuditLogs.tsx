import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, RefreshCcw, XCircle } from 'react-feather';
import { useQuery } from 'react-query';

import Layout from '../components/layout';
import FilterDropdown, {
  FilterDropdownSection,
} from '../components/shared/FilterDropdown';
import PageBrandFixed from '../components/shared/PageBrandFixed';
import useAuth from '../hooks/useAuth';
import useDebouncedValue from '../hooks/useDebouncedValue';
import AuditLog, { AuditLogStatus } from '../models/audit-log/AuditLog';
import auditLogService from '../services/AuditLogService';

type SelectOption = {
  label: string;
  value: string;
};

type DateRangeFilter = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

const ACTION_OPTIONS: SelectOption[] = [
  { label: 'User signed in', value: 'AUTH_LOGIN' },
  { label: 'User signed out', value: 'AUTH_LOGOUT' },
  { label: 'Session refreshed', value: 'AUTH_REFRESH' },
  { label: 'Session refresh failed', value: 'AUTH_REFRESH_FAIL' },
  { label: 'User created', value: 'USER_CREATE' },
  { label: 'User updated', value: 'USER_UPDATE' },
  { label: 'User deleted', value: 'USER_DELETE' },
  { label: 'User role changed', value: 'USER_ROLE_CHANGE' },
  { label: 'Course created', value: 'COURSE_CREATE' },
  { label: 'Course updated', value: 'COURSE_UPDATE' },
  { label: 'Course deleted', value: 'COURSE_DELETE' },
  { label: 'Content created', value: 'CONTENT_CREATE' },
  { label: 'Content updated', value: 'CONTENT_UPDATE' },
  { label: 'Content deleted', value: 'CONTENT_DELETE' },
  { label: 'User enrolled in course', value: 'COURSE_ENROLL' },
  { label: 'User left course', value: 'COURSE_UNENROLL' },
  { label: 'Course added to favorites', value: 'COURSE_FAVORITE' },
  { label: 'Course removed from favorites', value: 'COURSE_UNFAVORITE' },
];

const ENTITY_OPTIONS: SelectOption[] = [
  { label: 'Authentication', value: 'auth' },
  { label: 'User profile', value: 'user' },
  { label: 'Course', value: 'course' },
  { label: 'Content', value: 'content' },
  { label: 'Enrollment', value: 'enrollment' },
  { label: 'Favorite', value: 'favorite' },
];

const DATE_RANGE_OPTIONS: SelectOption[] = [
  { label: 'Any time', value: 'ALL' },
  { label: 'Today', value: 'TODAY' },
  { label: 'Last 7 days', value: 'LAST_7_DAYS' },
  { label: 'Last 30 days', value: 'LAST_30_DAYS' },
];

const ACTION_LABELS = ACTION_OPTIONS.reduce<Record<string, string>>(
  (accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  },
  {},
);

const ENTITY_LABELS = ENTITY_OPTIONS.reduce<Record<string, string>>(
  (accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  },
  {},
);

function humanizeText(rawValue: string): string {
  if (!rawValue) {
    return '-';
  }

  const withSpaces = rawValue
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();

  return withSpaces
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRole(role?: string | null): string {
  if (!role) {
    return '-';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  if (role === 'editor') {
    return 'Editor';
  }

  if (role === 'user') {
    return 'User';
  }

  return humanizeText(role);
}

function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function formatReference(value?: string | null): string {
  if (!value) {
    return '-';
  }

  if (value.length <= 16) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === 'string' || typeof entry === 'number'
          ? String(entry)
          : JSON.stringify(entry),
      )
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function getStatusPresentation(status: AuditLogStatus): {
  label: string;
  className: string;
} {
  if (status === 'SUCCESS') {
    return {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
  }

  return {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border border-red-200',
  };
}

function resolveDateRange(range: DateRangeFilter): {
  dateFrom?: string;
  dateTo?: string;
} {
  if (range === 'ALL') {
    return {};
  }

  const now = new Date();
  const startDate = new Date(now);

  if (range === 'TODAY') {
    startDate.setHours(0, 0, 0, 0);
    return { dateFrom: startDate.toISOString(), dateTo: now.toISOString() };
  }

  if (range === 'LAST_7_DAYS') {
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    return { dateFrom: startDate.toISOString(), dateTo: now.toISOString() };
  }

  startDate.setDate(now.getDate() - 29);
  startDate.setHours(0, 0, 0, 0);
  return { dateFrom: startDate.toISOString(), dateTo: now.toISOString() };
}

export default function AuditLogs() {
  const { authenticatedUser } = useAuth();

  const isAdmin = authenticatedUser?.role === 'admin';

  const [actorUserId, setActorUserId] = useState('');
  const [actorUsername, setActorUsername] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [status, setStatus] = useState<'ALL' | AuditLogStatus>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedActorUsername = useDebouncedValue(actorUsername);
  const debouncedEntityId = useDebouncedValue(entityId);
  const debouncedActorUserId = useDebouncedValue(actorUserId);

  const queryParams = useMemo(() => {
    const resolvedRange = resolveDateRange(dateRange);

    return {
      actorUserId: isAdmin ? debouncedActorUserId || undefined : undefined,
      actorUsername: debouncedActorUsername || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: debouncedEntityId || undefined,
      status: status === 'ALL' ? undefined : status,
      dateFrom: resolvedRange.dateFrom,
      dateTo: resolvedRange.dateTo,
      page,
      limit,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const,
    };
  }, [
    isAdmin,
    debouncedActorUserId,
    debouncedActorUsername,
    action,
    entityType,
    debouncedEntityId,
    status,
    dateRange,
    page,
    limit,
  ]);

  const {
    data: logsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery(
    ['audit-logs', queryParams],
    () => auditLogService.findAll(queryParams),
    {
      keepPreviousData: true,
      staleTime: 10000,
      refetchOnWindowFocus: false,
    },
  );

  const logs: AuditLog[] = logsResponse?.data ?? [];
  const total = logsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filterSections: FilterDropdownSection[] = useMemo(
    () => [
      {
        id: 'activity',
        label: 'Activity',
        selectedValue: action || 'ALL',
        options: [{ label: 'All activities', value: 'ALL' }, ...ACTION_OPTIONS],
        onSelect: (value) => {
          setAction(value === 'ALL' ? '' : value);
          setPage(1);
        },
      },
      {
        id: 'area',
        label: 'Area',
        selectedValue: entityType || 'ALL',
        options: [{ label: 'All areas', value: 'ALL' }, ...ENTITY_OPTIONS],
        onSelect: (value) => {
          setEntityType(value === 'ALL' ? '' : value);
          setPage(1);
        },
      },
      {
        id: 'result',
        label: 'Result',
        selectedValue: status,
        options: [
          { label: 'All results', value: 'ALL' },
          { label: 'Completed', value: 'SUCCESS' },
          { label: 'Failed', value: 'FAIL' },
        ],
        onSelect: (value) => {
          setStatus(value as 'ALL' | AuditLogStatus);
          setPage(1);
        },
      },
      {
        id: 'date-range',
        label: 'Date range',
        selectedValue: dateRange,
        options: DATE_RANGE_OPTIONS,
        onSelect: (value) => {
          setDateRange(value as DateRangeFilter);
          setPage(1);
        },
      },
      {
        id: 'page-size',
        label: 'Page size',
        selectedValue: String(limit),
        options: [
          { label: '5 per page', value: '5' },
          { label: '10 per page', value: '10' },
          { label: '20 per page', value: '20' },
        ],
        onSelect: (value) => {
          setLimit(Number(value));
          setPage(1);
        },
      },
    ],
    [action, entityType, status, dateRange, limit],
  );

  return (
    <Layout>
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1 className="font-semibold text-3xl">Audit Logs</h1>
        <PageBrandFixed />
      </div>
      <hr />

      <div className="table-filter mt-5">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
          {isAdmin ? (
            <input
              type="text"
              className="input h-11 min-w-[220px] shrink-0"
              placeholder="User ID (Admin filter)"
              value={actorUserId}
              onChange={(e) => {
                setActorUserId(e.target.value);
                setPage(1);
              }}
            />
          ) : null}

          <input
            type="text"
            className="input h-11 min-w-[200px] shrink-0"
            placeholder="Username"
            value={actorUsername}
            onChange={(e) => {
              setActorUsername(e.target.value);
              setPage(1);
            }}
          />

          <input
            type="text"
            className="input h-11 min-w-[200px] shrink-0"
            placeholder="Reference ID"
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setPage(1);
            }}
          />

          <div className="shrink-0">
            <FilterDropdown sections={filterSections} />
          </div>

          <button
            type="button"
            aria-label="Refresh audit logs"
            onClick={() => refetch()}
            className="h-10 w-10 shrink-0 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring transition-colors flex items-center justify-center disabled:opacity-50"
            disabled={isFetching}
          >
            <RefreshCcw
              size={16}
              className={isFetching ? 'animate-spin' : ''}
            />
          </button>

          <button
            type="button"
            className="btn px-4 py-2.5 shrink-0"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn px-4 py-2.5 shrink-0"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="table-container overflow-hidden border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                When
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Area
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Result
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Summary
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading
              ? null
              : logs.map((log) => {
                  const statusPresentation = getStatusPresentation(log.status);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-800">
                        {formatDateTime(log.createdAt)}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {log.actorUsername || 'System'}
                        </div>
                        {isAdmin && log.actorUserId ? (
                          <div
                            className="text-xs text-gray-500"
                            title={log.actorUserId}
                          >
                            ID: {formatReference(log.actorUserId)}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-700">
                        {formatRole(log.actorRole)}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {ACTION_LABELS[log.action] ||
                            humanizeText(log.action)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-800">
                          {ENTITY_LABELS[log.entityType] ||
                            humanizeText(log.entityType)}
                        </div>
                        {log.entityId ? (
                          <div
                            className="text-xs text-gray-500"
                            title={log.entityId}
                          >
                            Ref: {formatReference(log.entityId)}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusPresentation.className}`}
                        >
                          {log.status === 'SUCCESS' ? (
                            <CheckCircle size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {statusPresentation.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>
                          {log.message || 'Action registered successfully'}
                        </div>
                        {log.metadata ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-indigo-600 font-medium">
                              View additional details
                            </summary>
                            <div className="mt-2 rounded-md border bg-gray-50 p-2 text-xs text-gray-700">
                              {Object.entries(log.metadata).map(
                                ([key, value]) => (
                                  <div key={key} className="flex gap-2 py-0.5">
                                    <span className="font-semibold text-gray-600">
                                      {humanizeText(key)}:
                                    </span>
                                    <span>{formatMetadataValue(value)}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!isLoading && logs.length < 1 ? (
          <div className="text-center my-8 text-gray-500">
            <h1 className="text-lg">No activity found for this filter.</h1>
          </div>
        ) : null}
      </div>

      <p className="mt-3 text-center text-sm text-gray-600">
        Page {page} of {totalPages} | Total records: {total}
      </p>
    </Layout>
  );
}
