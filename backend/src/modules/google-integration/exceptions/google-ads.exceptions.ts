import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

export class GoogleAdsApiException extends InternalServerErrorException {
  constructor(message: string, errorCode?: string) {
    super(`Google Ads API Error: ${message}`, errorCode);
  }
}

export class GoogleAdsAuthenticationException extends UnauthorizedException {
  constructor(message: string = 'Google Ads authentication failed') {
    super(message);
  }
}

export class GoogleAdsAuthorizationException extends ForbiddenException {
  constructor(message: string = 'Insufficient permissions for Google Ads operation') {
    super(message);
  }
}

export class GoogleAdsResourceNotFoundException extends NotFoundException {
  constructor(resourceType: string, identifier: string) {
    super(`Google Ads ${resourceType} with identifier "${identifier}" not found`);
  }
}

export class GoogleAdsValidationException extends BadRequestException {
  constructor(field: string, message: string) {
    super(`Google Ads validation error for field "${field}": ${message}`);
  }
}

export class GoogleAdsQuotaExceededException extends ServiceUnavailableException {
  constructor(
    quotaType: string,
    retryAfterSeconds?: number,
    rateName?: string,
  ) {
    const retryMessage = retryAfterSeconds 
      ? ` Retry after ${retryAfterSeconds} seconds.`
      : '';
    const rateMessage = rateName ? ` Rate: ${rateName}.` : '';
    
    super(`Google Ads quota exceeded for ${quotaType}.${rateMessage}${retryMessage}`);
  }
}

export class GoogleAdsCampaignException extends BadRequestException {
  constructor(message: string) {
    super(`Google Ads Campaign Error: ${message}`);
  }
}

export class GoogleAdsConversionActionException extends BadRequestException {
  constructor(message: string) {
    super(`Google Ads Conversion Action Error: ${message}`);
  }
}

export class GoogleAdsCustomerException extends BadRequestException {
  constructor(message: string) {
    super(`Google Ads Customer Error: ${message}`);
  }
}

export class GoogleAdsNetworkException extends ServiceUnavailableException {
  constructor(message: string) {
    super(`Google Ads Network Error: ${message}`);
  }
}

export class GoogleAdsConfigurationException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Google Ads Configuration Error: ${message}`);
  }
}

export class GTMIntegrationException extends BadRequestException {
  constructor(message: string) {
    super(`GTM Integration Error: ${message}`);
  }
}