import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthGuard } from "../security/infrastructure/guards/auth.guard";
import { CustomersController } from "./presentation/customers.controller";
import { PgCustomerRepository } from "./infrastructure/pg-customer.repository";
@Module({ imports: [AuthModule], controllers: [CustomersController], providers: [AuthGuard, PgCustomerRepository], exports: [PgCustomerRepository] })
export class CustomersModule {}
