import { 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

export class CustomerNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Customer with identifier "${identifier}" not found`);
  }
}

export class CustomerEmailConflictException extends ConflictException {
  constructor(email: string) {
    super(`Customer with email "${email}" already exists in this tenant`);
  }
}

export class InvalidCustomerDataException extends BadRequestException {
  constructor(message: string) {
    super(`Invalid customer data: ${message}`);
  }
}

export class CustomerGoogleAccountException extends BadRequestException {
  constructor(message: string) {
    super(`Google account error: ${message}`);
  }
}

export class CustomerPermissionException extends ForbiddenException {
  constructor(action: string) {
    super(`Insufficient permissions to ${action} customer`);
  }
}

export class CustomerBulkOperationException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Bulk operation failed: ${message}`);
  }
}

export class CustomerValidationException extends BadRequestException {
  constructor(field: string, value: any, constraint: string) {
    super(`Validation failed for field "${field}" with value "${value}": ${constraint}`);
  }
}