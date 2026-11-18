import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { PgCustomerRepository } from "../infrastructure/pg-customer.repository";
import { CustomerProfile, PreferredLanguage } from "../domain/customer-profile";
@Controller("customers/me")
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: PgCustomerRepository) {}
  @Get() async get(@Req() req: { userId: string }) { return { profile: await this.customers.findByUserId(req.userId) }; }
  @Post() async save(@Req() req: { userId: string }, @Body() body: { displayName: string; country: string; preferredLanguage?: PreferredLanguage }) {
    if (!body?.displayName?.trim() || !/^[A-Z]{2}$/.test(body.country ?? "") || ![undefined,"en","rw","fr"].includes(body.preferredLanguage)) throw new BadRequestException("displayName, ISO country and supported preferredLanguage required");
    const profile = new CustomerProfile(req.userId, body.displayName.trim(), body.country, body.preferredLanguage ?? "en");
    await this.customers.save(profile);
    return { saved: true, profile };
  }
}
