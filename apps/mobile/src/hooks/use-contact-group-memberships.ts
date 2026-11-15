import { useCallback, useMemo } from 'react';
import { trpc } from '../lib/trpc';

export type ContactGroupRef = {
  id: string;
  name: string;
};

export function formatGroupMembershipLabel(
  groups: ContactGroupRef[] | undefined,
): string | null {
  if (!groups?.length) return null;
  if (groups.length === 1) return groups[0]!.name;
  if (groups.length === 2) return `${groups[0]!.name}, ${groups[1]!.name}`;
  return `${groups[0]!.name} +${groups.length - 1} more`;
}

export function useContactGroupMemberships() {
  const query = trpc.listContactGroupMemberships.useQuery(undefined, {
    staleTime: 30_000,
  });

  const byContactId = query.data?.byContactId ?? {};

  const getGroupsForContact = useCallback(
    (contactId: string): ContactGroupRef[] => byContactId[contactId] ?? [],
    [byContactId],
  );

  const getLabelForContact = useCallback(
    (contactId: string) =>
      formatGroupMembershipLabel(byContactId[contactId]),
    [byContactId],
  );

  const ungroupedIdSet = useMemo(
    () => new Set(query.data?.ungroupedIds ?? []),
    [query.data?.ungroupedIds],
  );

  const isInAnyGroup = useCallback(
    (contactId: string) => (byContactId[contactId]?.length ?? 0) > 0,
    [byContactId],
  );

  return {
    ...query,
    byContactId,
    ungroupedIdSet,
    getGroupsForContact,
    getLabelForContact,
    isInAnyGroup,
    groupedCount: query.data?.groupedCount ?? 0,
    ungroupedCount: query.data?.ungroupedCount ?? 0,
    totalContacts: query.data?.totalContacts ?? 0,
  };
}
