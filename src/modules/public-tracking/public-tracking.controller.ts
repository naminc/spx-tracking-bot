import type { Request, Response } from 'express';
import { successResponse } from '../../shared/response/api-response';
import { PublicTrackingService, publicTrackingService } from './public-tracking.service';
import type { PublicTrackInput } from './public-tracking.schema';

export class PublicTrackingController {
  constructor(private readonly service: PublicTrackingService = publicTrackingService) {}

  track = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.track(request.body as PublicTrackInput);
    response.json(successResponse('Tra cứu vận đơn thành công', result));
  };
}

export const publicTrackingController = new PublicTrackingController();
