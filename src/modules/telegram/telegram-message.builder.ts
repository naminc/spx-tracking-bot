import type { AddTrackingResult } from '../tracking/tracking.service';

type OrderListItem = {
  trackingNumber: string;
  currentStatus: string;
  lastEventTime: Date;
};

type TrackingMessageInput = {
  trackingNumber: string;
  status: string;
  location?: string;
  nextLocation?: string;
  eventTime: Date;
};

type UpdateMessageInput = TrackingMessageInput & {
  trackingCode: string;
  location?: string;
  nextLocation?: string;
  milestoneName?: string;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);

const removeCommandIcon = '<tg-emoji emoji-id="5836790414153094482">❎</tg-emoji>';
const contactCommandIcon = '<tg-emoji emoji-id="5443038326535759644">☎️</tg-emoji>';
const addCommandIcon = '<tg-emoji emoji-id="4956368289371522616">➕</tg-emoji>';
const startCommandIcon = '<tg-emoji emoji-id="6203791465471022369">ℹ️</tg-emoji>';
const listCommandIcon = '<tg-emoji emoji-id="5877618313139327986">📋</tg-emoji>';
const pingCommandIcon = '<tg-emoji emoji-id="5213260226194583825">📌</tg-emoji>';
const truckCommandIcon = '<tg-emoji emoji-id="6314504740130525114">🚚</tg-emoji>';
const helloCommandIcon = '<tg-emoji emoji-id="6143364153244390082">👋</tg-emoji>';
const exampleCommandIcon = '<tg-emoji emoji-id="6138429248706188838">🧾</tg-emoji>';

const buildLocationLines = (input: { location?: string; nextLocation?: string }): string => {
  const lines = [
    input.location ? `📍 <b>Vị trí hiện tại:</b> ${escapeHtml(input.location)}` : undefined,
    input.nextLocation ? `🚚 <b>Vị trí tiếp theo:</b> ${escapeHtml(input.nextLocation)}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  return lines ? `\n${lines}` : '';
};

const buildCompletedMessage = (title: string, input: TrackingMessageInput): string => `<b>${title}</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(input.trackingNumber)}</code>
📌 <b>Trạng thái:</b> ${escapeHtml(input.status)}${buildLocationLines(input)}
🕒 <b>Thời gian:</b> ${escapeHtml(formatDate(input.eventTime))}
⛔ <b>Theo dõi:</b> Bot đã tự động ngừng theo dõi đơn này.`;

export const telegramMessageBuilder = {
  start(): string {
    return `<b>${truckCommandIcon} SPX Tracking Bot</b>
━━━━━━━━━━━━━━━━

${helloCommandIcon} Xin chào! Mình có thể giúp bạn theo dõi trạng thái đơn hàng SPX tự động.

<b>${pingCommandIcon} Lệnh hỗ trợ</b>
━━━━━━━━━━━━━━━━
${addCommandIcon} <b>/add SPXVNXXX...</b> - Thêm đơn hàng cần theo dõi
${listCommandIcon} <b>/list</b> - Xem danh sách đơn đang theo dõi
${removeCommandIcon} <b>/remove SPXVNXXX...</b> - Xoá đơn khỏi danh sách
${contactCommandIcon} <b>/contact</b> - Liên hệ admin
${startCommandIcon} <b>/start</b> - Xem hướng dẫn

${exampleCommandIcon} <b>Ví dụ:</b> <code>/add SPXVN063015366786</code>`;
  },

  contact(adminUsername: string): string {
    return `<b>☎️ Liên hệ admin</b>
━━━━━━━━━━━━━━━━

💬 <b>Hỗ trợ:</b> Nếu bạn cần hỗ trợ, vui lòng liên hệ:
👤 <b>Admin Telegram:</b> ${escapeHtml(adminUsername)}`;
  },

  maintenance(): string {
    return `<b>⚠️ Bot đang bảo trì</b>
━━━━━━━━━━━━━━━━

Hiện tại bot đang tạm ngưng nhận đơn mới. Vui lòng thử lại sau hoặc dùng <b>/contact</b> để liên hệ admin.`;
  },

  addInstruction(): string {
    return `<b>➕ Thêm đơn SPX</b>
━━━━━━━━━━━━━━━━

ℹ️ <b>Hướng dẫn:</b> Vui lòng nhập mã vận đơn ngay sau lệnh <b>/add</b>.
⌨️ <b>Cú pháp: <code>/add &lt;mã_vận_đơn&gt;</code></b>
🧾 <b>Ví dụ:</b> <code>/add SPXVN063015366786</code>`;
  },

  directTrackingNumberNotAllowed(trackingNumber: string): string {
    return `<b>➕ Vui lòng dùng lệnh /add</b>
━━━━━━━━━━━━━━━━

⚠️ <b>Lý do:</b> Bot chỉ thêm đơn khi bạn gửi đúng cú pháp.
🧾 <b>Cú pháp:</b> <code>/add ${escapeHtml(trackingNumber)}</code>`;
  },

  checking(trackingNumber: string): string {
    return `<b>🔍 Đang kiểm tra đơn hàng</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>
⏳ <b>Xử lý:</b> Vui lòng chờ trong giây lát...`;
  },

  addSuccess(result: AddTrackingResult): string {
    return `<b>✅ Đã thêm đơn SPX thành công!</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(result.order.trackingNumber)}</code>
📌 <b>Trạng thái hiện tại:</b> ${escapeHtml(result.order.currentStatus)}${buildLocationLines(result.latestRecord)}
🕒 <b>Thời gian cập nhật:</b> ${escapeHtml(formatDate(result.order.lastEventTime))}
🔔 <b>Theo dõi:</b> Bot sẽ tự động kiểm tra và gửi thông báo khi có trạng thái mới.`;
  },

  alreadyExists(trackingNumber: string): string {
    return `<b>ℹ️ Đơn này đang được theo dõi</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>
ℹ️ <b>Gợi ý:</b> Bạn có thể dùng <b>/list</b> để xem danh sách đơn đang theo dõi.`;
  },

  update(input: UpdateMessageInput): string {
    return `<b>🔔 SPX Update:</b> ${escapeHtml(input.status)}
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(input.trackingNumber)}</code>
📌 <b>Trạng thái:</b> ${escapeHtml(input.status)}
🏷️ <b>Mã trạng thái:</b> <code>${escapeHtml(input.trackingCode)}</code>
🚚 <b>Giai đoạn:</b> ${escapeHtml(input.milestoneName || 'Không có dữ liệu')}${buildLocationLines(input)}
🕒 <b>Thời gian:</b> ${escapeHtml(formatDate(input.eventTime))}`;
  },

  list(orders: OrderListItem[]): string {
    const orderItems = orders
      .map(
        (order, index) => `<b>${index + 1}. 📦 <code>${escapeHtml(order.trackingNumber)}</code></b>
📌 <b>Trạng thái:</b> ${escapeHtml(order.currentStatus)}
🕒 <b>Thời gian:</b> ${escapeHtml(formatDate(order.lastEventTime))}`,
      )
      .join('\n\n');

    return `<b>📦 Danh sách đơn đang theo dõi</b>
━━━━━━━━━━━━━━━━

${orderItems}

📊 <b>Tổng cộng:</b> ${escapeHtml(orders.length)} đơn`;
  },

  emptyList(): string {
    return `<b>📭 Chưa có đơn nào đang theo dõi</b>
━━━━━━━━━━━━━━━━

🧾 <b>Lệnh mẫu:</b> <code>/add SPXVN063015366786</code>`;
  },

  removeSuccess(trackingNumber: string): string {
    return `<b>🗑️ Đã xoá đơn khỏi danh sách theo dõi</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>`;
  },

  removeMissingTrackingNumber(): string {
    return `<b>🗑️ Xoá đơn theo dõi</b>
━━━━━━━━━━━━━━━━

ℹ️ <b>Hướng dẫn:</b> Vui lòng nhập mã vận đơn cần xoá sau lệnh <b>/remove</b>.
⌨️ <b>Cú pháp: <code>/remove &lt;mã_vận_đơn&gt;</code></b>
🧾 <b>Ví dụ:</b> <code>/remove SPXVN063015366786</code>`;
  },

  invalidTrackingNumber(): string {
    return `<b>❌ Mã vận đơn không hợp lệ</b>
━━━━━━━━━━━━━━━━

🧾 <b>Định dạng:</b> <code>SPXVN063015366786</code>
🔁 <b>Gợi ý:</b> Vui lòng kiểm tra lại và gửi lại mã đúng.`;
  },

  delivered(input: TrackingMessageInput): string {
    return buildCompletedMessage('🎉 Đơn hàng đã giao thành công!', input);
  },

  failed(input: TrackingMessageInput): string {
    return buildCompletedMessage('❌ Giao hàng thất bại', input);
  },

  cancelled(input: TrackingMessageInput): string {
    return buildCompletedMessage('🚫 Đơn hàng đã bị huỷ', input);
  },

  spxError(trackingNumber: string): string {
    return `<b>⚠️ Không thể kiểm tra đơn hàng</b>
━━━━━━━━━━━━━━━━

📦 <b>Mã vận đơn:</b> <code>${escapeHtml(trackingNumber)}</code>
⚠️ <b>Lý do:</b> SPX chưa trả về dữ liệu hoặc API đang lỗi.
🔁 <b>Gợi ý:</b> Vui lòng thử lại sau.`;
  },

  unknownCommand(): string {
    return this.start();
  },
};
