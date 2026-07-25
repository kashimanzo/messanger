import { clickSendRequest, toE164 } from './http';

export type ClickSendList = {
  listId: number;
  listName: string;
  contactsCount: number;
};

export type ClickSendContactInput = {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
};

type RawList = {
  list_id?: number;
  list_name?: string;
  _contacts_count?: number;
};

function mapList(raw: RawList): ClickSendList {
  return {
    listId: Number(raw.list_id),
    listName: raw.list_name ?? '',
    contactsCount: Number(raw._contacts_count ?? 0),
  };
}

export async function createContactList(listName: string): Promise<ClickSendList> {
  const response = await clickSendRequest<RawList>('/lists', {
    method: 'POST',
    body: { list_name: listName },
  });

  if (!response.data?.list_id) {
    throw new Error('ClickSend did not return a list ID.');
  }

  return mapList(response.data);
}

export async function addContactToList(
  listId: number,
  contact: ClickSendContactInput,
) {
  await clickSendRequest(`/lists/${listId}/contacts`, {
    method: 'POST',
    body: {
      phone_number: toE164(contact.phoneNumber),
      first_name: contact.firstName?.trim() || 'Contact',
      last_name: contact.lastName?.trim() || '',
    },
  });
}

export async function createListWithContacts(options: {
  listName: string;
  contacts: ClickSendContactInput[];
}): Promise<ClickSendList> {
  const list = await createContactList(options.listName);

  for (const contact of options.contacts) {
    await addContactToList(list.listId, contact);
  }

  return {
    ...list,
    contactsCount: options.contacts.length,
  };
}
