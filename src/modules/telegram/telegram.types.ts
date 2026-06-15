export type TelegramMessage = {
  message_id: number;
  chat: {
    id: number | string;
  };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
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
  inline_keyboard: {
    text: string;
    callback_data: string;
  }[][];
};
