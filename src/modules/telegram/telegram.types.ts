export type TelegramMessage = {
  message_id: number;
  chat: {
    id: number | string;
  };
  text?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

export type TelegramGetUpdatesResponse = {
  ok: boolean;
  result: TelegramUpdate[];
  description?: string;
};
