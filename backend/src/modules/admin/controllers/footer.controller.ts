import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdminOnly } from '../../../common/decorators/admin-only.decorator';
import { FooterService } from '../services/footer.service';
import { CreateFooterContentDto, UpdateFooterContentDto } from '../dto/footer.dto';

@Controller('v1/admin/footer')
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminOnly()
export class FooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  async findAll(@Query('active') active?: string) {
    const activeFilter = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.footerService.findAll(activeFilter);
  }

  @Get('active')
  async findActive() {
    return this.footerService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.footerService.findOne(id);
  }

  @Post()
  async create(@Body() createFooterContentDto: CreateFooterContentDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.footerService.create(createFooterContentDto, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFooterContentDto: UpdateFooterContentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    return this.footerService.update(id, updateFooterContentDto, userId);
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.footerService.toggleActive(id, isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.footerService.delete(id);
  }
}
