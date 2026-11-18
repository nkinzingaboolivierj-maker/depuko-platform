import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { CustomerProfile } from "../domain/customer-profile";
@Injectable()
export class PgCustomerRepository {
  constructor(private readonly db: DatabaseService) {}
  async findByUserId(userId: string): Promise<CustomerProfile | null> {
    const rows = await this.db.query<{ user_id: string; display_name: string; country: string; preferred_language: "en" | "rw" | "fr" }>("SELECT user_id, display_name, country, preferred_language FROM customer_profiles WHERE user_id=$1", [userId]);
    const r = rows[0]; return r ? new CustomerProfile(r.user_id, r.display_name, r.country, r.preferred_language) : null;
  }
  async save(profile: CustomerProfile): Promise<void> {
    await this.db.query(`INSERT INTO customer_profiles (user_id, display_name, country, preferred_language) VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name, country=EXCLUDED.country, preferred_language=EXCLUDED.preferred_language`,
      [profile.userId, profile.displayName, profile.country, profile.preferredLanguage]);
  }
}
