export type JntTrackingEvent = {
  trackingNumber: string;
  trackingCode: string;
  trackingName: string;
  status: string;
  location?: string;
  nextLocation?: string;
  milestoneCode: string;
  milestoneName: string;
  eventTime: Date;
  rawData: {
    message: string;
    highlightedTexts: string[];
    rowText: string;
  };
};

export type ParsedJntTracking = {
  trackingNumber: string;
  events: JntTrackingEvent[];
};
