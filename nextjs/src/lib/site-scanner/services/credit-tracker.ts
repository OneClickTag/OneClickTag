import { prisma } from '@/lib/prisma';

export type ZenRowsTier = 'local' | 'zenrows_basic' | 'zenrows_js_render' | 'zenrows_premium' | 'zenrows_remote_browser';

const TIER_COSTS: Record<ZenRowsTier, number> = {
  local: 0,
  zenrows_basic: 1,
  zenrows_js_render: 5,
  zenrows_premium: 25,
  zenrows_remote_browser: 0,
};

export interface CreditBreakdown {
  local: number;
  basic: number;
  jsRender: number;
  premium: number;
  remoteBrowser: number;
}

export class CreditTracker {
  private scanId: string;
  totalCredits: number = 0;
  breakdown: CreditBreakdown = {
    local: 0,
    basic: 0,
    jsRender: 0,
    premium: 0,
    remoteBrowser: 0,
  };

  constructor(scanId: string) {
    this.scanId = scanId;
  }

  record(tier: ZenRowsTier): void {
    const cost = TIER_COSTS[tier];
    this.totalCredits += cost;

    switch (tier) {
      case 'local':
        this.breakdown.local++;
        break;
      case 'zenrows_basic':
        this.breakdown.basic++;
        break;
      case 'zenrows_js_render':
        this.breakdown.jsRender++;
        break;
      case 'zenrows_premium':
        this.breakdown.premium++;
        break;
      case 'zenrows_remote_browser':
        this.breakdown.remoteBrowser++;
        break;
    }
  }

  async persist(): Promise<void> {
    if (this.totalCredits === 0 && this.breakdown.local === 0) return;

    try {
      await prisma.siteScan.update({
        where: { id: this.scanId },
        data: {
          zenrowsCreditsUsed: { increment: this.totalCredits },
          zenrowsCreditBreakdown: this.breakdown as any,
        },
      });
    } catch (error) {
      console.warn(`[CreditTracker] Failed to persist credits for scan ${this.scanId}:`, error);
    }
  }
}

export function createCreditTracker(scanId: string): CreditTracker {
  return new CreditTracker(scanId);
}
