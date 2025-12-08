import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: { order: 'asc' },
    });

    return plans;
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    return plan;
  }

  async create(createPlanDto: CreatePlanDto) {
    const plan = await this.prisma.plan.create({
      data: createPlanDto,
    });

    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });

    return updatedPlan;
  }

  async toggleActive(id: string, isActive: boolean) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: { isActive },
    });

    return updatedPlan;
  }

  async delete(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }

    await this.prisma.plan.delete({ where: { id } });

    return { message: 'Plan deleted successfully' };
  }

  async reorder(plans: { id: string; order: number }[]) {
    await Promise.all(
      plans.map((plan) =>
        this.prisma.plan.update({
          where: { id: plan.id },
          data: { order: plan.order },
        }),
      ),
    );

    return { message: 'Plans reordered successfully' };
  }
}
