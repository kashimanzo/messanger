import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Box,
  Checkbox,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useContacts } from '../hooks/use-contacts';
import { VirtualList } from './virtual-list';

const CHECKBOX_COLUMN_WIDTH = 40;
const ROW_LEFT_PADDING = 12;
const ROW_HEIGHT = 52;
const ROW_HEIGHT_WITH_GROUPS = 64;
const EDGE_SCROLL_PX = 48;
const EDGE_SCROLL_SPEED = 14;

export type PickerContact = {
  id: string;
  name: string;
  phoneNumber: string;
};

type ContactPickerProps = {
  selectedIds: Set<string>;
  /** Preferred: replace the full selection set (used by drag-select). */
  onChange?: (next: Set<string>) => void;
  /** Single-tap toggle. Used when `onChange` is not provided. */
  onToggle?: (contactId: string) => void;
  search?: string;
  /** When set, pick from this list instead of the full phonebook. */
  items?: PickerContact[];
  emptyMessage?: string;
  height?: number | string;
  /** Optional map of contactId → group names label (e.g. "Sales, VIP"). */
  groupLabelsById?: Record<string, string | null | undefined>;
};

type ContactRowProps = {
  id: string;
  name: string;
  phoneNumber: string;
  groupLabel?: string | null;
  checked: boolean;
  onToggle: (contactId: string) => void;
  showDivider: boolean;
  rowHeight: number;
};

const ContactRow = memo(function ContactRow({
  id,
  name,
  phoneNumber,
  groupLabel,
  checked,
  onToggle,
  showDivider,
  rowHeight,
}: ContactRowProps) {
  return (
    <ListItemButton
      data-contact-id={id}
      onClick={() => onToggle(id)}
      dense
      sx={{
        py: 0.25,
        minHeight: rowHeight,
        height: rowHeight,
        pl: `${ROW_LEFT_PADDING}px`,
        pr: 1.5,
        borderBottom: showDivider ? '1px solid' : 'none',
        borderColor: 'divider',
        userSelect: 'none',
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: CHECKBOX_COLUMN_WIDTH,
          width: CHECKBOX_COLUMN_WIDTH,
          mr: 0,
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          tabIndex={-1}
          disableRipple
          sx={{ p: 0.5 }}
        />
      </ListItemIcon>
      <ListItemText
        primary={name}
        secondary={
          groupLabel
            ? `+${phoneNumber} · ${groupLabel}`
            : `+${phoneNumber}`
        }
        sx={{
          my: 0,
          '& .MuiListItemText-primary': {
            fontWeight: 500,
            fontSize: '0.875rem',
          },
          '& .MuiListItemText-secondary': {
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
    </ListItemButton>
  );
});

function filterContacts(
  contacts: PickerContact[],
  search?: string,
): PickerContact[] {
  const q = search?.trim().toLowerCase();
  if (!q) return contacts;
  return contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(q) ||
      contact.phoneNumber.includes(q),
  );
}

export function ContactPicker({
  selectedIds,
  onChange,
  onToggle,
  search,
  items,
  emptyMessage = 'No contacts found. Add contacts to your phonebook first.',
  height = '42vh',
  groupLabelsById,
}: ContactPickerProps) {
  const phonebook = useContacts(items ? undefined : search);
  const sourceContacts = items ?? phonebook.contacts;
  const contacts = useMemo(
    () => (items ? filterContacts(items, search) : sourceContacts),
    [items, search, sourceContacts],
  );
  const showGroupLabels = Boolean(
    groupLabelsById && Object.keys(groupLabelsById).length > 0,
  );
  const rowHeight = showGroupLabels ? ROW_HEIGHT_WITH_GROUPS : ROW_HEIGHT;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contactsRef = useRef(contacts);
  const selectedRef = useRef(selectedIds);
  const onChangeRef = useRef(onChange);
  const onToggleRef = useRef(onToggle);
  contactsRef.current = contacts;
  selectedRef.current = selectedIds;
  onChangeRef.current = onChange;
  onToggleRef.current = onToggle;

  const dragRef = useRef<{
    active: boolean;
    select: boolean;
    startIndex: number;
    lastIndex: number;
    pointerId: number;
    baseline: Set<string>;
  } | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const lastClientYRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const dragSelectZonePx = ROW_LEFT_PADDING + CHECKBOX_COLUMN_WIDTH + 8;
  const [isDragSelecting, setIsDragSelecting] = useState(false);

  const applySelection = useCallback((next: Set<string>) => {
    if (onChangeRef.current) {
      onChangeRef.current(next);
      return;
    }
    const prev = selectedRef.current;
    for (const id of next) {
      if (!prev.has(id)) onToggleRef.current?.(id);
    }
    for (const id of prev) {
      if (!next.has(id)) onToggleRef.current?.(id);
    }
  }, []);

  const applyRange = useCallback(
    (fromIndex: number, toIndex: number, select: boolean, baseline: Set<string>) => {
      const list = contactsRef.current;
      if (!list.length) return;
      const lo = Math.max(0, Math.min(fromIndex, toIndex));
      const hi = Math.min(list.length - 1, Math.max(fromIndex, toIndex));
      const next = new Set(baseline);
      for (let i = lo; i <= hi; i += 1) {
        const id = list[i]?.id;
        if (!id) continue;
        if (select) next.add(id);
        else next.delete(id);
      }
      applySelection(next);
    },
    [applySelection],
  );

  const rowHeightRef = useRef(rowHeight);
  rowHeightRef.current = rowHeight;

  const indexFromClientY = useCallback((clientY: number) => {
    const el = scrollRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top + el.scrollTop;
    const index = Math.floor(y / rowHeightRef.current);
    if (index < 0 || index >= contactsRef.current.length) return null;
    return index;
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current != null) {
      window.cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const tickAutoScroll = useCallback(() => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    const clientY = lastClientYRef.current;
    if (!drag?.active || !el || clientY == null) {
      stopAutoScroll();
      return;
    }

    const rect = el.getBoundingClientRect();
    let delta = 0;
    if (clientY < rect.top + EDGE_SCROLL_PX) {
      delta = -EDGE_SCROLL_SPEED;
    } else if (clientY > rect.bottom - EDGE_SCROLL_PX) {
      delta = EDGE_SCROLL_SPEED;
    }

    if (delta !== 0) {
      el.scrollTop += delta;
      const index = indexFromClientY(clientY);
      if (index != null) {
        drag.lastIndex = index;
        applyRange(drag.startIndex, index, drag.select, drag.baseline);
      }
    }

    autoScrollRef.current = window.requestAnimationFrame(tickAutoScroll);
  }, [applyRange, indexFromClientY, stopAutoScroll]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    lastClientYRef.current = null;
    setIsDragSelecting(false);
    stopAutoScroll();
  }, [stopAutoScroll]);

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  const handleToggle = useCallback((contactId: string) => {
    if (ignoreClickRef.current) {
      ignoreClickRef.current = false;
      return;
    }
    if (onChangeRef.current) {
      const next = new Set(selectedRef.current);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      onChangeRef.current(next);
      return;
    }
    onToggleRef.current?.(contactId);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    // Drag multi-select starts from the checkbox column so the rest of the
    // list can still scroll normally.
    if (localX > dragSelectZonePx) return;

    const index = indexFromClientY(event.clientY);
    if (index == null) return;

    const contact = contacts[index];
    if (!contact) return;

    event.preventDefault();
    ignoreClickRef.current = true;
    setIsDragSelecting(true);

    const select = !selectedIds.has(contact.id);
    const baseline = new Set(selectedIds);
    dragRef.current = {
      active: true,
      select,
      startIndex: index,
      lastIndex: index,
      pointerId: event.pointerId,
      baseline,
    };
    lastClientYRef.current = event.clientY;
    applyRange(index, index, select, baseline);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore capture failures on older webviews
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag?.active || drag.pointerId !== event.pointerId) return;

    lastClientYRef.current = event.clientY;
    const index = indexFromClientY(event.clientY);
    if (index != null && index !== drag.lastIndex) {
      drag.lastIndex = index;
      applyRange(drag.startIndex, index, drag.select, drag.baseline);
    }

    if (autoScrollRef.current == null) {
      autoScrollRef.current = window.requestAnimationFrame(tickAutoScroll);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    endDrag();
  };

  if (!items && phonebook.isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading contacts...
      </Typography>
    );
  }

  if (!items && phonebook.error) {
    return (
      <Typography variant="body2" color="error">
        {phonebook.error}
      </Typography>
    );
  }

  if (!contacts.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <VirtualList
      items={contacts}
      estimateSize={rowHeight}
      height={height}
      maxHeight={height}
      scrollRef={scrollRef}
      getItemKey={(contact) => contact.id}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: isDragSelecting ? 'none' : 'pan-y',
      }}
      renderItem={(contact, index) => (
        <ContactRow
          id={contact.id}
          name={contact.name}
          phoneNumber={contact.phoneNumber}
          groupLabel={groupLabelsById?.[contact.id]}
          checked={selectedIds.has(contact.id)}
          onToggle={handleToggle}
          showDivider={index < contacts.length - 1}
          rowHeight={rowHeight}
        />
      )}
    />
  );
}

type SelectAllContactsProps = {
  contacts: Array<{ id: string }>;
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
};

export function SelectAllContactsControl({
  contacts,
  selectedIds,
  onChange,
}: SelectAllContactsProps) {
  const allSelected =
    contacts.length > 0 &&
    contacts.every((contact) => selectedIds.has(contact.id));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 36,
        pl: `${ROW_LEFT_PADDING}px`,
        pr: 1.5,
        mb: 0.5,
      }}
    >
      <Box
        sx={{
          width: CHECKBOX_COLUMN_WIDTH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
        }}
      >
        <Checkbox
          size="small"
          sx={{ p: 0.5 }}
          checked={allSelected}
          indeterminate={
            contacts.some((contact) => selectedIds.has(contact.id)) &&
            !allSelected
          }
          onChange={() => {
            if (allSelected) {
              onChange(new Set());
              return;
            }

            onChange(new Set(contacts.map((contact) => contact.id)));
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {selectedIds.size} selected · drag on checkboxes to multi-select
      </Typography>
    </Box>
  );
}
