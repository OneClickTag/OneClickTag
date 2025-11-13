import { Process, Processor } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { CustomerService } from '../../modules/customer/services/customer.service';
import { TenantContextService } from '../../modules/tenant/services/tenant-context.service';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';
import { BulkCustomerImportJobData, JobQueues, JobProgress, JobResult } from '../interfaces/job.interface';
import { CreateCustomerDto, CustomerStatus } from '../../modules/customer/dto';
import { CustomerEmailConflictException } from '../../modules/customer/exceptions/customer.exceptions';

@Processor(JobQueues.BULK_IMPORT)
@Injectable()
export class BulkCustomerImportProcessor {
  private readonly logger = new Logger(BulkCustomerImportProcessor.name);

  constructor(
    private customerService: CustomerService,
    private cacheService: TenantCacheService,
  ) {}

  @Process()
  async processBulkImport(job: Job<BulkCustomerImportJobData>): Promise<JobResult> {
    const { data } = job;
    this.logger.log(`Processing bulk customer import job ${job.id} for tenant ${data.tenantId}`);

    // Set tenant context
    TenantContextService.setTenantId(data.tenantId);

    try {
      const { customers, importSettings } = data;
      const batchSize = importSettings.batchSize || 50;
      const totalCustomers = customers.length;

      const results = {
        successful: [] as any[],
        failed: [] as any[],
        skipped: [] as any[],
        duplicates: [] as any[],
      };

      await job.progress(5);

      // Process in batches
      for (let i = 0; i < totalCustomers; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalCustomers / batchSize);

        this.logger.log(`Processing batch ${batchNumber}/${totalBatches} with ${batch.length} customers`);

        await this.processBatch(batch, importSettings, results, data.triggeredBy);

        // Update progress
        const progress = Math.min(95, (i + batch.length) / totalCustomers * 90 + 5);
        await job.progress(progress);

        // Add small delay between batches to avoid overwhelming the database
        if (i + batchSize < totalCustomers) {
          await this.sleep(100);
        }
      }

      // Store import results in cache for later retrieval
      await this.cacheService.set(
        `import:${data.importId}:results`,
        results,
        { ttl: 86400 }, // 24 hours
      );

      await job.progress(100);

      this.logger.log(`Bulk import job ${job.id} completed. Successful: ${results.successful.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`);

      return {
        success: true,
        data: {
          importId: data.importId,
          results,
        },
        summary: {
          totalProcessed: totalCustomers,
          successful: results.successful.length,
          failed: results.failed.length,
          duration: Date.now() - job.timestamp,
        },
      };
    } catch (error) {
      this.logger.error(`Bulk import job ${job.id} failed: ${error.message}`, error.stack);

      return {
        success: false,
        errors: [
          {
            message: error.message,
            details: error,
            timestamp: new Date(),
          },
        ],
        summary: {
          totalProcessed: data.customers.length,
          successful: 0,
          failed: data.customers.length,
          duration: Date.now() - job.timestamp,
        },
      };
    } finally {
      // Clear tenant context
      TenantContextService.clearTenantId();
    }
  }

  private async processBatch(
    batch: BulkCustomerImportJobData['customers'],
    importSettings: BulkCustomerImportJobData['importSettings'],
    results: any,
    triggeredBy?: string,
  ): Promise<void> {
    for (const customerData of batch) {
      try {
        // Validate email if required
        if (importSettings.validateEmails && !this.isValidEmail(customerData.email)) {
          results.failed.push({
            email: customerData.email,
            error: 'Invalid email format',
            data: customerData,
          });
          continue;
        }

        // Check for duplicates if configured
        if (importSettings.skipDuplicates || importSettings.updateExisting) {
          const existingCustomer = await this.findExistingCustomer(customerData.email);
          
          if (existingCustomer) {
            if (importSettings.updateExisting) {
              // Update existing customer
              const updateData = this.prepareUpdateData(customerData);
              const updatedCustomer = await this.customerService.update(
                existingCustomer.id,
                updateData,
                triggeredBy,
              );
              
              results.successful.push({
                action: 'updated',
                customer: updatedCustomer,
                originalData: customerData,
              });
            } else {
              // Skip duplicate
              results.skipped.push({
                email: customerData.email,
                reason: 'Duplicate email',
                existingCustomerId: existingCustomer.id,
                data: customerData,
              });
            }
            continue;
          }
        }

        // Create new customer
        const createDto: CreateCustomerDto = {
          email: customerData.email,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          company: customerData.company,
          phone: customerData.phone,
          tags: customerData.tags || [],
          customFields: customerData.customFields || {},
          status: CustomerStatus.ACTIVE, // Default status for imported customers
        };

        const createdCustomer = await this.customerService.create(createDto, triggeredBy);

        results.successful.push({
          action: 'created',
          customer: createdCustomer,
          originalData: customerData,
        });

      } catch (error) {
        if (error instanceof CustomerEmailConflictException) {
          results.duplicates.push({
            email: customerData.email,
            error: error.message,
            data: customerData,
          });
        } else {
          results.failed.push({
            email: customerData.email,
            error: error.message,
            data: customerData,
          });
        }
      }
    }
  }

  private async findExistingCustomer(email: string): Promise<any | null> {
    try {
      // Use a simple query to check if customer exists
      // This is more efficient than using the full customer service
      const customer = await this.customerService.findAll({
        search: email,
        limit: 1,
        page: 1,
      });

      if (customer.data.length > 0 && customer.data[0].email.toLowerCase() === email.toLowerCase()) {
        return customer.data[0];
      }

      return null;
    } catch (error) {
      // If we can't check for existing customer, log error but continue
      this.logger.warn(`Could not check for existing customer with email ${email}: ${error.message}`);
      return null;
    }
  }

  private prepareUpdateData(customerData: BulkCustomerImportJobData['customers'][0]): any {
    const updateData: any = {};

    if (customerData.firstName) updateData.firstName = customerData.firstName;
    if (customerData.lastName) updateData.lastName = customerData.lastName;
    if (customerData.company) updateData.company = customerData.company;
    if (customerData.phone) updateData.phone = customerData.phone;
    if (customerData.tags && customerData.tags.length > 0) updateData.tags = customerData.tags;
    if (customerData.customFields && Object.keys(customerData.customFields).length > 0) {
      updateData.customFields = customerData.customFields;
    }

    return updateData;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}