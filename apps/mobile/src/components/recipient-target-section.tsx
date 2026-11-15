import { useMemo } from 'react';
import {
  Alert,
  Box,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { FiSearch } from 'react-icons/fi';
import {
  ContactPicker,
  SelectAllContactsControl,
  type PickerContact,
} from './contact-picker';

export type RecipientMode = 'contacts' | 'group_all' | 'group_members';

export type RecipientGroup = {
  id: string;
  name: string;
  memberCount: number;
  members?: Array<{
    id: string;
    name: string;
    phoneNumber: string;
  }>;
};

type RecipientTargetSectionProps = {
  mode: RecipientMode;
  onModeChange: (mode: RecipientMode) => void;
  groups: RecipientGroup[] | undefined;
  groupId: string;
  onGroupIdChange: (groupId: string) => void;
  selectedContactIds: Set<string>;
  onSelectedContactIdsChange: (next: Set<string>) => void;
  search: string;
  onSearchChange: (value: string) => void;
  phonebookContacts: PickerContact[];
  recipientCount: number;
};

const MODE_COPY: Record<
  RecipientMode,
  { label: string; helper: string }
> = {
  contacts: {
    label: 'Selected contacts',
    helper: 'Choose one or more people from your phonebook.',
  },
  group_all: {
    label: 'Whole group',
    helper: 'Send to every member of a contact group.',
  },
  group_members: {
    label: 'People in a group',
    helper: 'Pick a group, then choose only some of its members.',
  },
};

export function RecipientTargetSection({
  mode,
  onModeChange,
  groups,
  groupId,
  onGroupIdChange,
  selectedContactIds,
  onSelectedContactIdsChange,
  search,
  onSearchChange,
  phonebookContacts,
  recipientCount,
}: RecipientTargetSectionProps) {
  const selectedGroup = useMemo(
    () => groups?.find((group) => group.id === groupId) ?? null,
    [groups, groupId],
  );

  const groupMembers: PickerContact[] = useMemo(
    () =>
      (selectedGroup?.members ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        phoneNumber: member.phoneNumber,
      })),
    [selectedGroup],
  );

  const searchableContacts = useMemo(() => {
    if (mode === 'contacts') {
      const q = search.trim().toLowerCase();
      if (!q) return phonebookContacts;
      return phonebookContacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(q) ||
          contact.phoneNumber.includes(q),
      );
    }
    if (mode === 'group_members') {
      const q = search.trim().toLowerCase();
      if (!q) return groupMembers;
      return groupMembers.filter(
        (contact) =>
          contact.name.toLowerCase().includes(q) ||
          contact.phoneNumber.includes(q),
      );
    }
    return [];
  }, [mode, search, phonebookContacts, groupMembers]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        Recipients ({recipientCount})
      </Typography>

      <Tabs
        value={mode}
        onChange={(_, value: RecipientMode) => onModeChange(value)}
        variant="fullWidth"
        sx={{
          mb: 1,
          minHeight: 40,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: 40,
            py: 0.75,
            fontSize: '0.75rem',
            textTransform: 'none',
          },
        }}
      >
        <Tab label="Contacts" value="contacts" />
        <Tab label="Whole group" value="group_all" />
        <Tab label="From group" value="group_members" />
      </Tabs>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
        {MODE_COPY[mode].helper}
      </Typography>

      {(mode === 'group_all' || mode === 'group_members') && (
        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
          <InputLabel id="recipient-group-select">Contact group</InputLabel>
          <Select
            labelId="recipient-group-select"
            label="Contact group"
            value={groupId}
            onChange={(event) => onGroupIdChange(event.target.value)}
          >
            <MenuItem value="" dense>
              <em>Select a group</em>
            </MenuItem>
            {groups?.map((group) => (
              <MenuItem key={group.id} value={group.id} dense>
                {group.name} ({group.memberCount})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {mode === 'group_all' && groupId && selectedGroup ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          This message will go to all <strong>{selectedGroup.memberCount}</strong>{' '}
          member{selectedGroup.memberCount === 1 ? '' : 's'} in{' '}
          <strong>{selectedGroup.name}</strong>.
        </Alert>
      ) : null}

      {mode === 'group_all' && !groupId ? (
        <Alert severity="warning">Choose a contact group to continue.</Alert>
      ) : null}

      {mode === 'group_members' && groupId && groupMembers.length === 0 ? (
        <Alert severity="warning">
          This group has no members yet. Add contacts to the group first.
        </Alert>
      ) : null}

      {(mode === 'contacts' || mode === 'group_members') && (
        <Stack spacing={1}>
          {(mode === 'contacts' || (mode === 'group_members' && groupId)) && (
            <TextField
              size="small"
              fullWidth
              placeholder={
                mode === 'group_members'
                  ? 'Search people in this group'
                  : 'Search name or phone'
              }
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <FiSearch size={16} color="#9aa0a6" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {mode === 'contacts' || (mode === 'group_members' && groupId) ? (
            <>
              {searchableContacts.length > 0 ? (
                <SelectAllContactsControl
                  contacts={searchableContacts}
                  selectedIds={selectedContactIds}
                  onChange={(nextVisible) => {
                    const visibleIds = new Set(
                      searchableContacts.map((contact) => contact.id),
                    );
                    const merged = new Set(selectedContactIds);
                    for (const id of visibleIds) {
                      merged.delete(id);
                    }
                    for (const id of nextVisible) {
                      merged.add(id);
                    }
                    onSelectedContactIdsChange(merged);
                  }}
                />
              ) : null}
              <ContactPicker
                search={search}
                items={mode === 'group_members' ? groupMembers : undefined}
                selectedIds={selectedContactIds}
                onChange={onSelectedContactIdsChange}
                emptyMessage={
                  mode === 'group_members'
                    ? 'No matching members in this group.'
                    : 'No contacts found. Add contacts to your phonebook first.'
                }
              />
            </>
          ) : (
            <Alert severity="warning">Choose a contact group first.</Alert>
          )}
        </Stack>
      )}
    </Box>
  );
}

/** Build API recipient fields from the selected mode. */
export function buildRecipientPayload(input: {
  mode: RecipientMode;
  groupId: string;
  selectedContactIds: Set<string>;
}): { groupId?: string; contactIds: string[] } {
  if (input.mode === 'group_all') {
    return {
      groupId: input.groupId || undefined,
      contactIds: [],
    };
  }

  return {
    contactIds: [...input.selectedContactIds],
  };
}

export function countRecipients(input: {
  mode: RecipientMode;
  groupId: string;
  groups: RecipientGroup[] | undefined;
  selectedContactIds: Set<string>;
  phonebookContacts: PickerContact[];
}): number {
  if (input.mode === 'group_all') {
    const group = input.groups?.find((entry) => entry.id === input.groupId);
    return group?.memberCount ?? 0;
  }

  if (input.mode === 'group_members') {
    const group = input.groups?.find((entry) => entry.id === input.groupId);
    const memberIds = new Set((group?.members ?? []).map((member) => member.id));
    let count = 0;
    for (const id of input.selectedContactIds) {
      if (memberIds.has(id)) count += 1;
    }
    return count;
  }

  const phonebookIds = new Set(input.phonebookContacts.map((c) => c.id));
  let count = 0;
  for (const id of input.selectedContactIds) {
    if (phonebookIds.has(id)) count += 1;
  }
  return count;
}
