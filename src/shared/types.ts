export * from './schemas';

export interface ExtensionStatus {
  activeTabUrl?: string;
  isSupportedSite: boolean;
  isContest: boolean;
  trackingActive: boolean;
  hasApiKey: boolean;
  selectedModel: string;
}
