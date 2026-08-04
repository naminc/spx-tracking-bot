import { env } from './env';

const spxMaxAttempts = 3;

export const trackingProviderConfig = {
  spx: {
    apiUrl: env.SPX_API_URL,
    languageCode: env.SPX_LANGUAGE_CODE,
    requestTimeoutMs: env.SPX_REQUEST_TIMEOUT_MS,
    maxAttempts: spxMaxAttempts,
    buildHeaders: (trackingNumber: string) => ({
      accept: 'application/json, text/plain, */*',
      'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
      referer: `https://spx.vn/track?${trackingNumber}`,
      'user-agent': env.TRACKING_HTTP_USER_AGENT,
    }),
  },
  ghn: {
    trackingLogsUrl: env.GHN_TRACKING_LOGS_URL,
    requestTimeoutMs: env.GHN_REQUEST_TIMEOUT_MS,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: env.GHN_TRACKING_ORIGIN,
      referer: env.GHN_TRACKING_REFERER,
      'user-agent': env.TRACKING_HTTP_USER_AGENT,
    },
  },
  jnt: {
    trackingUrl: env.JNT_TRACKING_URL,
    requestTimeoutMs: env.JNT_REQUEST_TIMEOUT_MS,
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
      referer: env.JNT_TRACKING_REFERER,
      'user-agent': env.TRACKING_HTTP_USER_AGENT,
    },
  },
} as const;
