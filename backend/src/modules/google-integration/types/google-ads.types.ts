export interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  customerId?: string;
}

export interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  descriptiveName: string;
  canManageClients: boolean;
  testAccount: boolean;
  manager: boolean;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  advertisingChannelType: AdvertisingChannelType;
  advertisingChannelSubType?: string;
  biddingStrategyType: BiddingStrategyType;
  budget: string;
  targetSpend?: number;
  startDate?: string;
  endDate?: string;
  servingStatus: ServingStatus;
  optimizationScore?: number;
}

export interface ConversionAction {
  id: string;
  name: string;
  category: ConversionActionCategory;
  status: ConversionActionStatus;
  type: ConversionActionType;
  countingType: ConversionCountingType;
  clickThroughLookbackWindowDays: number;
  viewThroughLookbackWindowDays: number;
  value?: number;
  currency?: string;
  gtmTag?: GTMConversionTag;
  attributionModelSettings?: AttributionModelSettings;
}

export interface GTMConversionTag {
  conversionId: string;
  conversionLabel: string;
  globalSiteTag: string;
  eventSnippet: string;
  gtmTagId?: string;
  gtmContainerId?: string;
}

export interface AttributionModelSettings {
  attributionModel: AttributionModel;
  dataDrivenModelStatus?: DataDrivenModelStatus;
}

export interface GoogleAdsError {
  errorCode: string;
  message: string;
  trigger?: string;
  location?: string;
  details?: any;
}

export interface QuotaError {
  quotaErrorType: QuotaErrorType;
  rateName?: string;
  rateScope?: string;
  retryAfterSeconds?: number;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  cost: number;
  ctr: number;
  averageCpc: number;
  costPerConversion: number;
  conversionRate: number;
}

// Enums
export enum CampaignStatus {
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export enum AdvertisingChannelType {
  SEARCH = 'SEARCH',
  DISPLAY = 'DISPLAY',
  SHOPPING = 'SHOPPING',
  HOTEL = 'HOTEL',
  VIDEO = 'VIDEO',
  MULTI_CHANNEL = 'MULTI_CHANNEL',
  LOCAL = 'LOCAL',
  SMART = 'SMART',
  PERFORMANCE_MAX = 'PERFORMANCE_MAX',
}

export enum BiddingStrategyType {
  MANUAL_CPC = 'MANUAL_CPC',
  MANUAL_CPM = 'MANUAL_CPM',
  MANUAL_CPV = 'MANUAL_CPV',
  MAXIMIZE_CONVERSIONS = 'MAXIMIZE_CONVERSIONS',
  MAXIMIZE_CONVERSION_VALUE = 'MAXIMIZE_CONVERSION_VALUE',
  TARGET_CPA = 'TARGET_CPA',
  TARGET_IMPRESSION_SHARE = 'TARGET_IMPRESSION_SHARE',
  TARGET_ROAS = 'TARGET_ROAS',
  TARGET_SPEND = 'TARGET_SPEND',
  PERCENT_CPC = 'PERCENT_CPC',
  TARGET_CPM = 'TARGET_CPM',
}

export enum ServingStatus {
  SERVING = 'SERVING',
  NONE = 'NONE',
  ENDED = 'ENDED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum ConversionActionCategory {
  DEFAULT = 'DEFAULT',
  PAGE_VIEW = 'PAGE_VIEW',
  PURCHASE = 'PURCHASE',
  SIGNUP = 'SIGNUP',
  LEAD = 'LEAD',
  DOWNLOAD = 'DOWNLOAD',
  ADD_TO_CART = 'ADD_TO_CART',
  BEGIN_CHECKOUT = 'BEGIN_CHECKOUT',
  SUBSCRIBE_PAID = 'SUBSCRIBE_PAID',
  PHONE_CALL_LEAD = 'PHONE_CALL_LEAD',
  IMPORTED_LEAD = 'IMPORTED_LEAD',
  SUBMIT_LEAD_FORM = 'SUBMIT_LEAD_FORM',
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  REQUEST_QUOTE = 'REQUEST_QUOTE',
  GET_DIRECTIONS = 'GET_DIRECTIONS',
  OUTBOUND_CLICK = 'OUTBOUND_CLICK',
  CONTACT = 'CONTACT',
  ENGAGEMENT = 'ENGAGEMENT',
  STORE_VISIT = 'STORE_VISIT',
  STORE_SALE = 'STORE_SALE',
}

export enum ConversionActionStatus {
  ENABLED = 'ENABLED',
  REMOVED = 'REMOVED',
  HIDDEN = 'HIDDEN',
}

export enum ConversionActionType {
  AD_CALL = 'AD_CALL',
  CLICK_TO_CALL = 'CLICK_TO_CALL',
  GOOGLE_PLAY_DOWNLOAD = 'GOOGLE_PLAY_DOWNLOAD',
  GOOGLE_PLAY_IN_APP_PURCHASE = 'GOOGLE_PLAY_IN_APP_PURCHASE',
  UPLOAD_CALLS = 'UPLOAD_CALLS',
  UPLOAD_CLICKS = 'UPLOAD_CLICKS',
  WEBPAGE = 'WEBPAGE',
  WEBSITE_CALL = 'WEBSITE_CALL',
  STORE_SALES_DIRECT_UPLOAD = 'STORE_SALES_DIRECT_UPLOAD',
  STORE_SALES = 'STORE_SALES',
  FIREBASE_ANDROID = 'FIREBASE_ANDROID',
  FIREBASE_IOS = 'FIREBASE_IOS',
  THIRD_PARTY_APP_ANALYTICS = 'THIRD_PARTY_APP_ANALYTICS',
  GOOGLE_ATTRIBUTION = 'GOOGLE_ATTRIBUTION',
}

export enum ConversionCountingType {
  ONE_PER_CLICK = 'ONE_PER_CLICK',
  MANY_PER_CLICK = 'MANY_PER_CLICK',
}

export enum AttributionModel {
  EXTERNAL = 'EXTERNAL',
  GOOGLE_ADS_LAST_CLICK = 'GOOGLE_ADS_LAST_CLICK',
  GOOGLE_SEARCH_ATTRIBUTION_FIRST_CLICK = 'GOOGLE_SEARCH_ATTRIBUTION_FIRST_CLICK',
  GOOGLE_SEARCH_ATTRIBUTION_LINEAR = 'GOOGLE_SEARCH_ATTRIBUTION_LINEAR',
  GOOGLE_SEARCH_ATTRIBUTION_TIME_DECAY = 'GOOGLE_SEARCH_ATTRIBUTION_TIME_DECAY',
  GOOGLE_SEARCH_ATTRIBUTION_POSITION_BASED = 'GOOGLE_SEARCH_ATTRIBUTION_POSITION_BASED',
  GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN = 'GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN',
}

export enum DataDrivenModelStatus {
  UNKNOWN = 'UNKNOWN',
  AVAILABLE = 'AVAILABLE',
  STALE = 'STALE',
  EXPIRED = 'EXPIRED',
  NEVER_GENERATED = 'NEVER_GENERATED',
}

export enum QuotaErrorType {
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  RESOURCE_TEMPORARILY_EXHAUSTED = 'RESOURCE_TEMPORARILY_EXHAUSTED',
}

export interface GoogleAdsApiConfig {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  login_customer_id?: string;
}

// For compatibility with google-ads-api library
export interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  loginCustomerId?: string;
}

export interface GoogleAdsQuery {
  query: string;
  customerIds?: string[];
  pageSize?: number;
  pageToken?: string;
}

export interface GoogleAdsQueryResult<T = any> {
  results: T[];
  nextPageToken?: string;
  totalResultsCount?: number;
  fieldMask?: string;
}