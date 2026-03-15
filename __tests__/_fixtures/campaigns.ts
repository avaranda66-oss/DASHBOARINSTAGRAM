import type { AdCampaign } from '@/types/ads';

/** Campaign with daily budget, active, good metrics */
export const activeCampaign: AdCampaign = {
  id: 'camp_001',
  name: 'Test Campaign Active',
  status: 'ACTIVE',
  effective_status: 'ACTIVE',
  objective: 'CONVERSIONS',
  daily_budget: '5000', // $50.00 in cents
  lifetime_budget: undefined,
  budget_remaining: '300000', // $3000 in cents
  start_time: '2026-02-15T00:00:00Z',
  stop_time: '2026-03-15T00:00:00Z',
  created_time: '2026-02-14T00:00:00Z',
  insights: {
    spend: '25.50',
    impressions: '15000',
    clicks: '450',
    ctr: '3.0',
    cpc: '0.0567',
    cpm: '1.70',
    frequency: '2.1',
    reach: '7143',
    date_start: '2026-02-15',
    date_stop: '2026-03-14',
    actions: [
      { action_type: 'offsite_conversion.fb_pixel_purchase', value: '12' },
      { action_type: 'offsite_conversion.fb_pixel_lead', value: '5' },
      { action_type: 'link_click', value: '450' },
    ],
    purchase_roas: [
      { action_type: 'omni_purchase', value: '3.5' },
    ],
  } as any,
};

/** Campaign with no budget (should return null from pacing) */
export const noBudgetCampaign: AdCampaign = {
  id: 'camp_002',
  name: 'No Budget Campaign',
  status: 'ACTIVE',
  effective_status: 'ACTIVE',
  objective: 'REACH',
  daily_budget: undefined,
  lifetime_budget: undefined,
  budget_remaining: undefined,
  start_time: '2026-03-01T00:00:00Z',
  created_time: '2026-03-01T00:00:00Z',
  insights: {
    spend: '10.00',
    impressions: '5000',
    clicks: '100',
    ctr: '2.0',
    cpc: '0.10',
    cpm: '2.00',
    frequency: '1.5',
    reach: '3333',
    date_start: '2026-03-01',
    date_stop: '2026-03-14',
  } as any,
};

/** Campaign with zero spend */
export const zeroSpendCampaign: AdCampaign = {
  id: 'camp_003',
  name: 'Zero Spend Campaign',
  status: 'PAUSED',
  effective_status: 'PAUSED',
  objective: 'CONVERSIONS',
  daily_budget: '10000', // $100 in cents
  start_time: '2026-03-10T00:00:00Z',
  created_time: '2026-03-10T00:00:00Z',
  insights: {
    spend: '0',
    impressions: '0',
    clicks: '0',
    ctr: '0',
    cpc: '0',
    cpm: '0',
    frequency: '0',
    reach: '0',
    date_start: '2026-03-10',
    date_stop: '2026-03-14',
  } as any,
};

/** Campaign with no insights at all */
export const noInsightsCampaign: AdCampaign = {
  id: 'camp_004',
  name: 'No Insights Campaign',
  status: 'ACTIVE',
  objective: 'TRAFFIC',
  daily_budget: '2000', // $20 in cents
  start_time: '2026-03-12T00:00:00Z',
  created_time: '2026-03-12T00:00:00Z',
} as AdCampaign;
