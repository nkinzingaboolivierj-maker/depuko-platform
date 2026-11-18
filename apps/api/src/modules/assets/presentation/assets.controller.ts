import { Body, Controller, HttpException, HttpStatus, Param, Post, Req, UseGuards, Inject } from "@nestjs/common";
import { ASSET_REPOSITORY, AssetRepositoryPort } from "../domain/asset.repository.port";
import { AuthGuard } from "../../security/infrastructure/guards/auth.guard";

@Controller("assets")
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(@Inject(ASSET_REPOSITORY) private readonly assets: AssetRepositoryPort) {}

  @Post(":id/reserve")
  async reserve(@Param("id") id: string, @Req() req: { userId: string }, @Body() body: { organizationId: string; start: string; end: string }) {
    try {
      const row = await this.assets.reserve({
        assetId: id,
        organizationId: body.organizationId,
        reservedBy: req.userId,
        start: new Date(body.start),
        end: new Date(body.end),
      });
      return { reserved: true, reservationId: row.id };
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.CONFLICT);
    }
  }
}