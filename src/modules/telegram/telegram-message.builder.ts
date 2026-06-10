import type { AddTrackingResult } from '../tracking/tracking.service';

type OrderListItem = {
  trackingNumber: string;
  currentStatus: string;
  lastEventTime: Date;
};

type TrackingMessageInput = {
  trackingNumber: string;
  status: string;
  eventTime: Date;
};

type UpdateMessageInput = TrackingMessageInput & {
  trackingCode: string;
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

const buildCompletedMessage = (title: string, input: TrackingMessageInput): string => `<b>${title}</b>
━━━━━━━━━━━━━━━━

<b>📦 Mã vận đơn</b>
<code>${escapeHtml(input.trackingNumber)}</code>

<b>📌 Trạng thái</b>
${escapeHtml(input.status)}

<b>🕒 Thời gian</b>
${escapeHtml(formatDate(input.eventTime))}

<b>⛔ Theo dõi</b>
Bot đã tự động ngừng theo dõi đơn này.`;

export const telegramMessageBuilder = {
  start(): string {
    return `<b>🚚 SPX Tracking Bot</b>

Xin chào! Mình có thể giúp bạn theo dõi trạng thái đơn hàng SPX tự động.

<b>📌 Lệnh hỗ trợ</b>
━━━━━━━━━━━━━━━━
➕ <b>/add SPXVN...</b> - Thêm đơn hàng cần theo dõi
📦 <b>/list</b> - Xem danh sách đơn đang theo dõi
🗑️ <b>/remove SPXVN...</b> - Xoá đơn khỏi danh sách
☎️ <b>/contact</b> - Liên hệ admin
ℹ️ <b>/start</b> - Xem hướng dẫn

<b>🧾 Ví dụ</b>
<code>/add SPXVN063015366786</code>`;
  },

  contact(adminUsername: string): string {
    return `<b>☎️ Liên hệ admin</b>
━━━━━━━━━━━━━━━━

Nếu bạn cần hỗ trợ, vui lòng liên hệ:

👤 Admin Telegram:
<b>${escapeHtml(adminUsername)}</b>`;
  },

  addInstruction(): string {
    return `<b>➕ Thêm đơn SPX</b>

Vui lòng nhập mã vận đơn ngay sau lệnh <b>/add</b>.

<b>Cú pháp:</b>
<code>/add SPXVN063015366786</code>`;
  },

  directTrackingNumberNotAllowed(trackingNumber: string): string {
    return `<b>➕ Vui lòng dùng lệnh /add</b>

Bot chỉ thêm đơn khi bạn gửi đúng cú pháp:

<code>/add ${escapeHtml(trackingNumber)}</code>`;
  },

  checking(trackingNumber: string): string {
    return `<b>🔍 Đang kiểm tra đơn hàng</b>

📦 Mã vận đơn:
<code>${escapeHtml(trackingNumber)}</code>

Vui lòng chờ trong giây lát...`;
  },

  addSuccess(result: AddTrackingResult): string {
    return `<b>✅ Đã thêm đơn SPX thành công!</b>

<b>📦 Mã vận đơn</b>
<code>${escapeHtml(result.order.trackingNumber)}</code>

<b>📌 Trạng thái hiện tại</b>
${escapeHtml(result.order.currentStatus)}

<b>🕒 Thời gian cập nhật</b>
${escapeHtml(formatDate(result.order.lastEventTime))}

<b>🔔 Theo dõi</b>
Bot sẽ tự động kiểm tra và gửi thông báo khi có trạng thái mới.`;
  },

  alreadyExists(trackingNumber: string): string {
    return `<b>ℹ️ Đơn này đang được theo dõi</b>

📦 Mã vận đơn:
<code>${escapeHtml(trackingNumber)}</code>

Bạn có thể dùng <b>/list</b> để xem danh sách đơn đang theo dõi.`;
  },

  update(input: UpdateMessageInput): string {
    return `<b>🔔 SPX Update</b>
━━━━━━━━━━━━━━━━

<b>📦 Mã vận đơn</b>
<code>${escapeHtml(input.trackingNumber)}</code>

<b>📌 Trạng thái mới</b>
${escapeHtml(input.status)}

<b>🏷️ Mã trạng thái</b>
<code>${escapeHtml(input.trackingCode)}</code>

<b>🚚 Giai đoạn</b>
${escapeHtml(input.milestoneName || 'Không có dữ liệu')}

<b>🕒 Thời gian</b>
${escapeHtml(formatDate(input.eventTime))}`;
  },

  list(orders: OrderListItem[]): string {
    const orderItems = orders
      .map(
        (order, index) => `<b>${index + 1}. 📦 <code>${escapeHtml(order.trackingNumber)}</code></b>
📌 ${escapeHtml(order.currentStatus)}
🕒 ${escapeHtml(formatDate(order.lastEventTime))}`,
      )
      .join('\n\n');

    return `<b>📦 Danh sách đơn đang theo dõi</b>
━━━━━━━━━━━━━━━━

${orderItems}

<b>📊 Tổng cộng:</b> ${escapeHtml(orders.length)} đơn`;
  },

  emptyList(): string {
    return `<b>📭 Chưa có đơn nào đang theo dõi</b>

Bạn có thể thêm đơn bằng lệnh:

<code>/add SPXVN063015366786</code>`;
  },

  removeSuccess(trackingNumber: string): string {
    return `<b>🗑️ Đã xoá đơn khỏi danh sách theo dõi</b>

📦 Mã vận đơn:
<code>${escapeHtml(trackingNumber)}</code>`;
  },

  removeMissingTrackingNumber(): string {
    return `<b>🗑️ Xoá đơn theo dõi</b>

Vui lòng nhập mã vận đơn cần xoá.

<b>Cú pháp:</b>
<code>/remove SPXVN063015366786</code>`;
  },

  invalidTrackingNumber(): string {
    return `<b>❌ Mã vận đơn không hợp lệ</b>

Mã SPX phải có dạng:

<code>SPXVN063015366786</code>

Vui lòng kiểm tra lại và gửi lại mã đúng.`;
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

📦 Mã vận đơn:
<code>${escapeHtml(trackingNumber)}</code>

Lý do: SPX chưa trả về dữ liệu hoặc API đang lỗi.

Vui lòng thử lại sau.`;
  },

  unknownCommand(): string {
    return this.start();
  },
};
