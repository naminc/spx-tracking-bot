export type TelegramUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number | string;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type TelegramGetUpdatesResponse = {
  ok: boolean;
  result: TelegramUpdate[];
  description?: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: (
    | {
        text: string;
        callback_data: string;
      }
    | {
        text: string;
        url: string;
      }
  )[][];
};
