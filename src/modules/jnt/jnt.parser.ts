import * as cheerio from 'cheerio';
import { AppError } from '../../shared/errors/app-error';
import { normalizeTrackingNumber } from '../tracking/tracking-carrier';
import type { JntTrackingEvent, ParsedJntTracking } from './jnt.types';

const timePattern = /^\d{2}:\d{2}:\d{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const normalizeText = (value: string): string =>
  value
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

const normalizeForMatch = (value: string): string =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const parseEventTime = (date: string | undefined, time: string | undefined): Date | undefined => {
  if (!date || !time) {
    return undefined;
  }

  const eventTime = new Date(`${date}T${time}+07:00`);
  return Number.isNaN(eventTime.getTime()) ? undefined : eventTime;
};

const buildTrackingCode = (message: string): string => {
  const normalizedMessage = normalizeForMatch(message);

  if (
    normalizedMessage.includes('da ky nhan') ||
    normalizedMessage.includes('giao hang thanh cong') ||
    normalizedMessage.includes('delivered')
  ) {
    return 'DELIVERED';
  }

  if (normalizedMessage.includes('dang giao hang')) {
    return 'DELIVERING';
  }

  if (normalizedMessage.includes('hang da duoc chuyen den')) {
    return 'ARRIVED_AT_HUB';
  }

  if (
    normalizedMessage.includes('dang chuyen hang den') ||
    normalizedMessage.includes('dang trung chuyen')
  ) {
    return 'IN_TRANSIT';
  }

  if (
    normalizedMessage.includes('khong thanh cong') ||
    normalizedMessage.includes('that bai') ||
    normalizedMessage.includes('failed')
  ) {
    return 'FAILED';
  }

  if (
    normalizedMessage.includes('da huy') ||
    normalizedMessage.includes('da huỷ') ||
    normalizedMessage.includes('cancel')
  ) {
    return 'CANCELLED';
  }

  return 'JNT_EVENT';
};

const buildMilestoneName = (trackingCode: string): string => {
  if (trackingCode === 'DELIVERED') {
    return 'Delivered';
  }

  if (trackingCode === 'DELIVERING') {
    return 'Delivering';
  }

  if (trackingCode === 'ARRIVED_AT_HUB') {
    return 'Arrived at hub';
  }

  if (trackingCode === 'FAILED') {
    return 'Failed';
  }

  if (trackingCode === 'CANCELLED') {
    return 'Cancelled';
  }

  return 'In transit';
};

const resolveLocations = (
  message: string,
  highlightedTexts: string[],
): { location?: string; nextLocation?: string } => {
  const normalizedMessage = normalizeForMatch(message);

  if (
    normalizedMessage.includes('buu cuc') &&
    normalizedMessage.includes('dang chuyen hang den') &&
    highlightedTexts.length >= 2
  ) {
    return {
      location: highlightedTexts[0],
      nextLocation: highlightedTexts[1],
    };
  }

  if (normalizedMessage.includes('hang da duoc chuyen den') && highlightedTexts[0]) {
    return { location: highlightedTexts[0] };
  }

  if (
    normalizedMessage.includes('cua buu cuc') &&
    normalizedMessage.includes('dang giao hang') &&
    highlightedTexts.length >= 2
  ) {
    return { location: highlightedTexts[1] };
  }

  if (normalizedMessage.includes('dang giao hang') && highlightedTexts[0]) {
    return { location: highlightedTexts[0] };
  }

  return {};
};

export const parseJntTrackingHtml = (
  html: string,
  expectedTrackingNumber: string,
): ParsedJntTracking => {
  const normalizedExpectedTrackingNumber = normalizeTrackingNumber(expectedTrackingNumber);
  const $ = cheerio.load(html);
  const blocks = $('.result-tracking .result_vandon').toArray();
  const matchingBlock = blocks.find((block) => {
    const inputId = $(block).find('input[id^="chck-"]').attr('id') ?? '';
    const idTrackingNumber = inputId.replace(/^chck-/i, '').trim().toUpperCase();
    const headerTrackingNumber = normalizeText($(block).find('header span').first().text()).toUpperCase();

    return (
      idTrackingNumber === normalizedExpectedTrackingNumber ||
      headerTrackingNumber === normalizedExpectedTrackingNumber
    );
  });

  if (!matchingBlock) {
    throw new AppError('J&T did not return tracking information for this order', 404);
  }

  const events = $(matchingBlock)
    .find('.result-vandon-item')
    .toArray()
    .map<JntTrackingEvent | null>((item) => {
      const row = $(item);
      const spans = row
        .find('span')
        .toArray()
        .map((span) => normalizeText($(span).text()))
        .filter(Boolean);
      const time = spans.find((value) => timePattern.test(value));
      const date = spans.find((value) => datePattern.test(value));
      const eventTime = parseEventTime(date, time);
      const messageNode = row.children('div').last();
      const message = normalizeText(messageNode.text());
      const highlightedTexts = messageNode
        .find('font')
        .toArray()
        .map((font) => normalizeText($(font).text()))
        .filter(Boolean);

      if (!eventTime || !message) {
        return null;
      }

      const trackingCode = buildTrackingCode(message);
      const locations = resolveLocations(message, highlightedTexts);

      return {
        trackingNumber: normalizedExpectedTrackingNumber,
        trackingCode,
        trackingName: message,
        status: message,
        location: locations.location,
        nextLocation: locations.nextLocation,
        milestoneCode: trackingCode,
        milestoneName: buildMilestoneName(trackingCode),
        eventTime,
        rawData: {
          message,
          highlightedTexts,
          rowText: normalizeText(row.text()),
        },
      };
    })
    .filter((event): event is JntTrackingEvent => Boolean(event))
    .sort((first, second) => second.eventTime.getTime() - first.eventTime.getTime());

  if (events.length === 0) {
    throw new AppError('J&T did not return tracking history for this order', 404);
  }

  return {
    trackingNumber: normalizedExpectedTrackingNumber,
    events,
  };
};
