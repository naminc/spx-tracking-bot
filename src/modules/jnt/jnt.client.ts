import axios, { AxiosError } from 'axios';
import { trackingProviderConfig } from '../../config/tracking-providers';
import { AppError } from '../../shared/errors/app-error';
import { logger } from '../../shared/logger/logger';

export class JntClient {
  async getTrackingHtml(trackingNumber: string, phoneLast4: string): Promise<string> {
    try {
      const response = await axios.get<ArrayBuffer>(trackingProviderConfig.jnt.trackingUrl, {
        params: {
          type: 'track',
          billcode: trackingNumber,
          cellphone: phoneLast4,
        },
        headers: trackingProviderConfig.jnt.headers,
        responseType: 'arraybuffer',
        timeout: trackingProviderConfig.jnt.requestTimeoutMs,
      });

      return new TextDecoder('utf-8').decode(response.data);
    } catch (error) {
      const statusCode = error instanceof AxiosError ? error.response?.status : undefined;
      logger.warn({ err: error, statusCode, trackingNumber }, 'J&T request failed');
      throw new AppError('Could not fetch order information from J&T', 502, error);
    }
  }
}

export const jntClient = new JntClient();
