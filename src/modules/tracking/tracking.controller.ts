import type { Request, Response } from 'express';
import { getPaginationMeta } from '../../shared/pagination/pagination';
import { paginatedResponse, successResponse } from '../../shared/response/api-response';
import { authService } from '../admin/auth/auth.service';
import {
  TrackingOrderActionSource,
  TrackingOrderActionType,
  trackingOrderActionLogService,
} from '../tracking-action-log/tracking-action-log.service';
import type { FinalStatus } from './final-status';
import type { TrackingCarrier } from './tracking-carrier';
import { maskTrackingCredential } from './tracking-credential';
import type { TrackingOrderEntity } from './tracking.repository';
import { TrackingService, trackingService } from './tracking.service';

const toPublicTrackingOrder = (order: TrackingOrderEntity) => ({
  ...order,
  trackingCredential: maskTrackingCredential(order.carrier, order.trackingCredential),
});

export class TrackingController {
  constructor(private readonly service: TrackingService = trackingService) {}

  listOrders = async (request: Request, response: Response): Promise<void> => {
    const {
      carrier,
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      finalStatus,
      includeCompleted,
      page,
      limit,
      sort,
    } = request.query as unknown as {
      carrier?: TrackingCarrier;
      trackingNumber?: string;
      telegramChatId?: string;
      userId?: number;
      telegramUserId?: string;
      finalStatus?: FinalStatus;
      includeCompleted?: boolean;
      page: number;
      limit: number;
      sort: 'UPDATED_DESC' | 'CREATED_DESC' | 'LAST_EVENT_DESC' | 'STATUS';
    };

    const result = await this.service.listOrders({
      carrier,
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      finalStatus,
      includeCompleted,
      page,
      limit,
      sort,
    });

    response.json(
      paginatedResponse(
        'Fetched tracking orders successfully',
        result.data.map(toPublicTrackingOrder),
        getPaginationMeta(result),
      ),
    );
  };

  listHistories = async (request: Request, response: Response): Promise<void> => {
    const { carrier, trackingNumber, telegramChatId, userId, telegramUserId, page, limit, sort } =
      request.query as unknown as {
        carrier?: TrackingCarrier;
        trackingNumber?: string;
        telegramChatId?: string;
        userId?: number;
        telegramUserId?: string;
        page: number;
        limit: number;
        sort: 'EVENT_DESC' | 'EVENT_ASC' | 'CREATED_DESC';
      };

    const result = await this.service.listHistories({
      carrier,
      trackingNumber,
      telegramChatId,
      userId,
      telegramUserId,
      page,
      limit,
      sort,
    });

    response.json(
      paginatedResponse(
        'Fetched tracking histories successfully',
        result.data,
        getPaginationMeta(result),
      ),
    );
  };

  getOrder = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { carrier } = request.query as unknown as { carrier: TrackingCarrier | 'AUTO' };
    const order = await this.service.getOrder(trackingNumber, carrier);
    response.json(successResponse('Fetched tracking order successfully', toPublicTrackingOrder(order)));
  };

  createOrder = async (request: Request, response: Response): Promise<void> => {
    const { carrier, trackingNumber, telegramChatId, userId, note, trackingCredential } = request.body as {
      carrier: TrackingCarrier | 'AUTO';
      trackingNumber: string;
      telegramChatId: string;
      userId?: number;
      note?: string | null;
      trackingCredential?: string;
    };

    const admin = authService.requireAdmin(request);
    const result = await this.service.addOrder(
      trackingNumber,
      telegramChatId,
      note,
      carrier,
      trackingCredential,
      userId,
    );
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
        trackingCredential: maskTrackingCredential(result.order.carrier, result.order.trackingCredential),
      },
    });

    response
      .status(result.alreadyExists ? 200 : 201)
      .json(
        successResponse(
          result.alreadyExists
            ? 'Tracking order already exists'
            : 'Tracking order created successfully',
          {
            order: toPublicTrackingOrder(result.order),
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
    response.json(successResponse('Tracking order deleted successfully', toPublicTrackingOrder(deletedOrder)));
  };

  getHistories = async (request: Request, response: Response): Promise<void> => {
    const { trackingNumber } = request.params as { trackingNumber: string };
    const { carrier } = request.query as unknown as { carrier: TrackingCarrier | 'AUTO' };
    const histories = await this.service.getHistories(trackingNumber, carrier);
    response.json(successResponse('Fetched tracking history successfully', histories));
  };
}

export const trackingController = new TrackingController();
