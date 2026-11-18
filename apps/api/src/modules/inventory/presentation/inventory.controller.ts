import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, UseGuards, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { STOCK_REPOSITORY, StockRepositoryPort } from "../domain/stock.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";
import { DatabaseService } from "../../../infrastructure/database/database.service";

/** Organization-scoped stock operations. The supplied organization id is
 * treated only as a selector; membership and role are always checked server-side. */
@Controller("inventory")
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(
    @Inject(STOCK_REPOSITORY) private readonly stock: StockRepositoryPort,
    private readonly db: DatabaseService,
  ) {}

  @Post("items/:id/reserve")
  async reserve(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { units: number; organizationId: string }) {
    await this.requireInventoryManager(body?.organizationId, req.userId);
    if (!Number.isSafeInteger(body?.units) || body.units <= 0) throw new HttpException("units must be a positive integer", HttpStatus.BAD_REQUEST);
    try {
      const row = await this.stock.reserve(id, body.organizationId, body.units);
      return { id, reserved: body.units, available: row.quantity_total - row.quantity_reserved };
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.CONFLICT);
    }
  }

  @Post("items/:id/release")
  async release(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { units: number; organizationId: string }) {
    await this.requireInventoryManager(body?.organizationId, req.userId);
    if (!Number.isSafeInteger(body?.units) || body.units <= 0) throw new HttpException("units must be a positive integer", HttpStatus.BAD_REQUEST);
    await this.stock.release(id, body.organizationId, body.units);
    return { id, released: body.units };
  }

  @Get("items/:id")
  async get(@Param("id") id: string, @Req() req: { userId: string }, @Query("organizationId") organizationId: string) {
    await this.requireInventoryManager(organizationId, req.userId);
    const row = await this.stock.findByIdForOrg(id, organizationId);
    if (!row) throw new NotFoundException("stock item not found");
    return row;
  }

  private async requireInventoryManager(organizationId: string | undefined, userId: string): Promise<void> {
    if (!organizationId?.trim()) throw new HttpException("organizationId is required", HttpStatus.BAD_REQUEST);
    const rows = await this.db.query<{ role: string }>(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [organizationId, userId],
    );
    if (!rows.length || !["owner", "admin", "manager"].includes(rows[0]!.role)) {
      throw new ForbiddenException("organization manager membership required");
    }
  }
}
