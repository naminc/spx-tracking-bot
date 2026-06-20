import type { Request, Response } from 'express';
import { authService } from '../admin/auth/auth.service';
import { successResponse } from '../../shared/response/api-response';
import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  trackingOrderActionLogService,
} from '../tracking-action-log/tracking-action-log.service';
import type { FinalStatus } from './final-status';
import { TrackingService, trackingService } from './tracking.service';
import type { TrackingCarrier } from './tracking-carrier';

export class TrackingController {
  constructor(private readonly service: TrackingService = trackingService) {}

  listOrders = async (request: Request, response: Response): Promise<void> => {
    const { carrier, trackingNumber, telegramChatId, userId, telegramUserId, finalStatus, includeCompleted } =
      request.query as unknown as {
      carrier?: TrackingCarrier;
      trackingNumber?: string;
      telegramChatId?: string;
      userId?: number;
      telegramUserId?: string;
      finalStatus?: FinalStatus;
      includeCompleted?: boolean;
    };

    const orders = await this.service.listOrders({
      carrier,
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      finalStatus,
      includeCompleted,
    });
    response.json(successResponse('Lấy danh sách đơn hàng thành công', orders));
  };

  listHistories = async (request: Request, response: Response): Promise<void> => {
    const { carrier, trackingNumber, telegramChatId, userId, telegramUserId, limit } = request.query as unknown as {
      carrier?: TrackingCarrier;
      trackingNumber?: string;
      telegramChatId?: string;
      userId?: number;
      telegramUserId?: string;
      limit?: number;
    };

    const histories = await this.service.listHistories({
      carrier,
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      limit,
    });
    response.json(successResponse('Lấy lịch sử tracking thành công', histories));
  };

  getOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { carrier } = request.query as unknown as { carrier: TrackingCarrier | 'AUTO' };
    const order = await this.service.getOrder(trackingNumber, carrier);
    response.json(successResponse('Lấy thông tin đơn hàng thành công', order));
  };

  createOrder = async (request: Request, response: Response): Promise<void> => {
    const { carrier, trackingNumber, telegramChatId, note } = request.body as {
      carrier: TrackingCarrier | 'AUTO';
      trackingNumber: string;
      telegramChatId: string;
      note?: string | null;
    };

    const admin = authService.requireAdmin(request);
    const result = await this.service.addOrder(trackingNumber, telegramChatId, note, carrier);
    await trackingOrderActionLogService.safeCreateLog({
      carrier: result.order.carrier,
      action: TrackingOrderActionType.ADD,
      source: TrackingOrderActionSource.ADMIN,
      trackingNumber: result.order.trackingNumber,
      telegramChatId: result.order.telegramChatId,
      userId: result.order.userId,
      orderId: result.order.id,
      adminTelegramId: admin.telegramId,
      adminUsername: admin.username,
      metadata: {
        via: 'admin_web',
        carrier: result.order.carrier,
        alreadyExists: result.alreadyExists,
        note: result.order.note,
        noteUpdated: result.noteUpdated,
      },
    });

    response
      .status(result.alreadyExists ? 200 : 201)
      .json(
        successResponse(
          result.alreadyExists
            ? 'Đơn hàng đã tồn tại trong danh sách theo dõi'
            : 'Thêm đơn hàng thành công',
          {
            order: result.order,
            alreadyExists: result.alreadyExists,
            noteUpdated: result.noteUpdated,
          },
        ),
      );
  };

  deleteOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { carrier, telegramChatId } = request.query as unknown as {
      carrier: TrackingCarrier | 'AUTO';
      telegramChatId: string;
    };
    const admin = authService.requireAdmin(request);
    const deletedOrder = await this.service.removeOrder(trackingNumber, telegramChatId, carrier);
    await trackingOrderActionLogService.safeCreateLog({
      carrier: deletedOrder.carrier,
      action: TrackingOrderActionType.REMOVE,
      source: TrackingOrderActionSource.ADMIN,
      trackingNumber: deletedOrder.trackingNumber,
      telegramChatId: deletedOrder.telegramChatId,
      userId: deletedOrder.userId,
      adminTelegramId: admin.telegramId,
      adminUsername: admin.username,
      metadata: {
        via: 'admin_web',
        carrier: deletedOrder.carrier,
        deletedOrderId: deletedOrder.id,
      },
    });
    response.json(successResponse('Xóa theo dõi đơn hàng thành công', deletedOrder));
  };

  getHistories = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { carrier } = request.query as unknown as { carrier: TrackingCarrier | 'AUTO' };
    const histories = await this.service.getHistories(trackingNumber, carrier);
    response.json(successResponse('Lấy lịch sử đơn hàng thành công', histories));
  };
}

export const trackingController = new TrackingController();
