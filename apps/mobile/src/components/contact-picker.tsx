import {
  Box,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useContacts } from '../hooks/use-contacts';

const CHECKBOX_COLUMN_WIDTH = 40;
const ROW_LEFT_PADDING = 12;

type ContactPickerProps = {
  selectedIds: Set<string>;
  onToggle: (contactId: string) => void;
  search?: string;
};

export function ContactPicker({ selectedIds, onToggle, search }: ContactPickerProps) {
  const { contacts, isLoading, error } = useContacts(search);

  if (isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading contacts...
      </Typography>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error}
      </Typography>
    );
  }

  if (!contacts.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No contacts found. Add contacts to your phonebook first.
      </Typography>
    );
  }

  return (
    <List
      dense
      disablePadding
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        maxHeight: '42vh',
        overflowY: 'auto',
      }}
    >
      {contacts.map((contact, index) => (
        <ListItem key={contact.id} disablePadding divider={index < contacts.length - 1}>
          <ListItemButton
            onClick={() => onToggle(contact.id)}
            dense
            sx={{ py: 0.25, minHeight: 40, pl: `${ROW_LEFT_PADDING}px`, pr: 1.5 }}
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
                checked={selectedIds.has(contact.id)}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0.5 }}
              />
            </ListItemIcon>
            <ListItemText
              primary={contact.name}
              secondary={`+${contact.phoneNumber}`}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 500,
                noWrap: true,
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                sx: { color: 'text.disabled' },
                noWrap: true,
              }}
              sx={{ my: 0 }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
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
    contacts.length > 0 && contacts.every((contact) => selectedIds.has(contact.id));

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
            contacts.some((contact) => selectedIds.has(contact.id)) && !allSelected
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
        {selectedIds.size} selected
      </Typography>
    </Box>
  );
}
