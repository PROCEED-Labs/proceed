import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UserMessage = string;

type SystemMessage = {
  message: string;
  onDone?: () => void;
};

export type Message = {
  author: 'user' | 'system';
  message: string;
  loading?: boolean;
  onDone?: () => void;
};

type ChatStoreType = {
  messages: Message[];
  addUserMessage: (newEntry: UserMessage) => void;
  startSystemMessage: () => void;
  addSystemMessage: (newEntry: SystemMessage) => void;
};

export const useChatStore = create<ChatStoreType>()(
  persist(
    (set, get) => ({
      messages: [],
      addUserMessage: (usermessage) => {
        set({
          messages: [
            ...get().messages,
            {
              message: usermessage,
              author: 'user',
              loading: false,
              onDone: undefined,
            },
          ],
        });
      },
      startSystemMessage: () => {
        set({
          messages: [
            ...get().messages,
            {
              message: '',
              author: 'system',
              loading: true,
              onDone: undefined,
            },
          ],
        });
      },
      addSystemMessage: (newEntry) => {
        const filteredMessages = get().messages.filter((message) => !message.loading);
        set({
          messages: [
            ...filteredMessages,
            {
              message: newEntry.message,
              author: 'system',
              loading: false,
              onDone: newEntry.onDone,
            },
          ],
        });
      },
    }),
    {
      name: 'chat-log',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
