import type { HttpClient } from "../http.ts";
import type { CreateCampaignParams, CreateCampaignResponse } from "../types.ts";

/**
 * Bulk campaign management.
 * Access via client.campaigns
 */
export class CampaignsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create and queue a new campaign.
   *
   * Two modes:
   * - Broadcast: same text to all contacts
   * - Individualized: different text per contact via messages array
   *
   * Scheduling defaults: today, 10:00-22:00, America/New_York.
   *
   * @example
   * // Broadcast
   * await client.campaigns.create({
   *   name: 'Launch blast',
   *   text: 'Hey, we just launched!',
   *   contacts: ['+13231112233', '+13232223344'],
   * })
   *
   * // Individualized
   * await client.campaigns.create({
   *   name: 'Personal outreach',
   *   messages: [
   *     { contact: '+13231112233', text: 'Hey Alex!' },
   *     { contact: '+13232223344', text: 'Hey Jordan!' },
   *   ],
   * })
   *
   * // Scheduled with timezone
   * await client.campaigns.create({
   *   name: 'Weekend blast',
   *   text: 'Weekend vibes',
   *   contacts: ['+13231112233'],
   *   from_date: '2026-04-10',
   *   from_time: '09:00',
   *   to_time:   '21:00',
   *   timezone:  'America/Los_Angeles',
   * })
   */
  create(params: CreateCampaignParams): Promise<CreateCampaignResponse> {
    return this.http.post<CreateCampaignResponse>(
      "/api/v1/campaigns/new/",
      params,
    );
  }
}
