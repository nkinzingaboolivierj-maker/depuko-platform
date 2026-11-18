import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../../../infrastructure/database/database.service";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";

@Controller("organizations")
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly db: DatabaseService) {}

  @Get("mine")
  async mine(@Req() req: { userId: string }) {
    const organizations = await this.db.query(
      `SELECT o.id, o.business_type, o.legal_name, o.country, o.industry, o.status, m.role
       FROM organizations o JOIN organization_members m ON m.organization_id=o.id
       WHERE m.user_id=$1 ORDER BY o.created_at DESC`, [req.userId]);
    return { organizations };
  }

  @Post()
  async create(@Req() req: { userId: string }, @Body() body: { businessType: string; legalName: string; country: string; industry: string; capabilities?: string[] }) {
    if (!body?.businessType || !body.legalName?.trim() || !/^[A-Z]{2}$/.test(body.country ?? "") || !body.industry?.trim()) throw new BadRequestException("businessType, legalName, ISO country and industry are required");
    const id = `org_${randomUUID()}`;
    await this.db.withTransaction(async (query) => {
      await query("INSERT INTO organizations (id,business_type,legal_name,country,industry,capabilities) VALUES ($1,$2,$3,$4,$5,$6)", [id, body.businessType, body.legalName.trim(), body.country, body.industry.trim(), body.capabilities ?? []]);
      await query("INSERT INTO organization_members (id,organization_id,user_id,role) VALUES ($1,$2,$3,'owner')", [`mem_${randomUUID()}`, id, req.userId]);
      await query("INSERT INTO business_onboarding_sessions (id,organization_id,template_id,status) VALUES ($1,$2,$3,'registered') ON CONFLICT (organization_id) DO NOTHING", [`onb_${randomUUID()}`, id, body.businessType]);
    });
    return { organizationId: id, status: "registered" };
  }

  @Get(":id/workspace")
  async workspace(@Param("id") id: string, @Req() req: { userId: string }) {
    const role = await this.requireMember(id, req.userId);
    const row = await this.db.query<{ business_type: string; status: string }>("SELECT business_type,status FROM organizations WHERE id=$1", [id]);
    if (!row[0]) throw new NotFoundException("organization not found");
    const modules = ["dashboard", "services", "branches", "orders", "staff", "projects", "support"];
    if (["owner", "admin", "finance"].includes(role)) modules.push("finance");
    return { organizationId: id, status: row[0].status, modules, businessType: row[0].business_type, memberRole: role };
  }

  @Get(":id/services")
  async services(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.requireMember(id, req.userId);
    return { services: await this.db.query("SELECT id,name,price_cents,status,created_at FROM organization_services WHERE organization_id=$1 ORDER BY created_at DESC", [id]) };
  }

  @Post(":id/services")
  async addService(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { name: string; priceCents: number }) {
    await this.requireManager(id, req.userId);
    if (!body?.name?.trim() || !Number.isSafeInteger(body.priceCents) || body.priceCents <= 0) throw new BadRequestException("name and positive integer priceCents are required");
    const serviceId = `os_${randomUUID()}`;
    await this.db.query("INSERT INTO organization_services (id,organization_id,name,price_cents,status) VALUES ($1,$2,$3,$4,'draft')", [serviceId,id,body.name.trim(),body.priceCents]);
    return { serviceId, status: "draft", message: "Service saved as draft; platform review/publication is not implied." };
  }

  @Get(":id/branches")
  async branches(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.requireMember(id, req.userId);
    return { branches: await this.db.query("SELECT id,name,region FROM organization_branches WHERE organization_id=$1 ORDER BY name", [id]) };
  }

  @Post(":id/branches")
  async addBranch(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { name: string; region: string }) {
    await this.requireManager(id, req.userId);
    if (!body?.name?.trim() || !body.region?.trim()) throw new BadRequestException("branch name and region are required");
    const branchId = `br_${randomUUID()}`;
    await this.db.query("INSERT INTO organization_branches (id,organization_id,name,region) VALUES ($1,$2,$3,$4)", [branchId,id,body.name.trim(),body.region.trim()]);
    return { branchId, created: true };
  }

  @Get(":id/members")
  async members(@Param("id") id: string, @Req() req: { userId: string }) {
    await this.requireManager(id, req.userId);
    return { members: await this.db.query("SELECT m.user_id,m.role,u.email FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 ORDER BY m.role,m.user_id", [id]) };
  }

  @Post(":id/members")
  async inviteMember(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { userId: string; role: string }) {
    await this.requireManager(id, req.userId);
    const roles = new Set(["admin", "finance", "manager", "staff"]);
    if (!body?.userId || !roles.has(body.role)) throw new BadRequestException("existing userId and permitted non-owner role are required");
    const user = await this.db.query("SELECT id FROM users WHERE id=$1", [body.userId]);
    if (!user.length) throw new NotFoundException("user to invite was not found; create an account first");
    await this.db.query("INSERT INTO organization_members (id,organization_id,user_id,role) VALUES ($1,$2,$3,$4) ON CONFLICT (organization_id,user_id) DO UPDATE SET role=EXCLUDED.role", [`mem_${randomUUID()}`, id, body.userId, body.role]);
    return { invited: true, userId: body.userId, role: body.role };
  }

  private async requireMember(orgId: string, userId: string) {
    const rows = await this.db.query<{ role: string }>("SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2", [orgId,userId]);
    if (!rows.length) throw new ForbiddenException("not a member of this organization");
    return rows[0].role;
  }
  private async requireManager(orgId: string, userId: string) {
    const role = await this.requireMember(orgId, userId);
    if (!["owner", "admin", "manager"].includes(role)) throw new ForbiddenException("owner, admin or manager role required");
  }
}
