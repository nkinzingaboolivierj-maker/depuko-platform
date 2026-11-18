import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
export interface OnboardingRow { id: string; organization_id: string; template_id: string; status: string; answers: Record<string, unknown>; rejection_reasons: string[] }
@Injectable()
export class PgOnboardingRepository {
  constructor(private readonly db: DatabaseService) {}
  async findForOrganization(organizationId: string, userId: string): Promise<OnboardingRow | null> {
    const rows = await this.db.query<OnboardingRow>(
      `SELECT s.id,s.organization_id,s.template_id,s.status,s.answers,s.rejection_reasons
       FROM business_onboarding_sessions s JOIN organization_members m ON m.organization_id=s.organization_id
       WHERE s.organization_id=$1 AND m.user_id=$2`, [organizationId,userId]);
    return rows[0] ?? null;
  }
  async saveAnswer(organizationId: string, fieldId: string, value: unknown): Promise<void> {
    await this.db.query("UPDATE business_onboarding_sessions SET answers=answers || jsonb_build_object($2::text,$3::jsonb), status='onboarding_in_progress', updated_at=now() WHERE organization_id=$1", [organizationId, fieldId, JSON.stringify(value)]);
  }
}
