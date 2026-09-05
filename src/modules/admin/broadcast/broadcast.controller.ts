import type { Request, Response } from 'express';
import { successResponse } from '../../../shared/response/api-response';
import {
  BroadcastService,
  broadcastService,
} from './broadcast.service';
import type {
  CreateBroadcastInput,
  FailedRecipientsExportQuery,
} from './broadcast.schema';

export class BroadcastController {
  constructor(private readonly service: BroadcastService = broadcastService) {}

  listBroadcasts = async (_request: Request, response: Response): Promise<void> => {
    const broadcasts = await this.service.listBroadcasts();
    response.json(successResponse('Fetched broadcasts successfully', broadcasts));
  };

  getBroadcast = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as { id: number };
    const broadcast = await this.service.getBroadcast(id);
    response.json(successResponse('Fetched broadcast detail successfully', broadcast));
  };

  createBroadcast = async (request: Request, response: Response): Promise<void> => {
    const broadcast = await this.service.createBroadcast(
      request.body as CreateBroadcastInput,
    );
    response
      .status(201)
      .json(successResponse('Created broadcast successfully', broadcast));
  };

  sendBroadcast = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as { id: number };
    const broadcast = await this.service.sendBroadcast(id);
    response.json(successResponse('Finished sending broadcast', broadcast));
  };

  exportFailedRecipients = async (request: Request, response: Response): Promise<void> => {
    const { id } = request.params as unknown as { id: number };
    const file = await this.service.exportFailedRecipients(
      id,
      request.query as unknown as FailedRecipientsExportQuery,
    );

    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.body);
  };
}

export const broadcastController = new BroadcastController();
