import { Module } from "@nestjs/common";
import { PayrollRulesRegistry } from "./domain/payroll-rules.registry";

/** PHASE 3: the registry ships EMPTY. Countries are enabled only after the
 * owner registers REVIEWED rules (human reviewer + reviewed config). Until
 * then every payroll calculation attempt fails closed with PAYROLL
 * UNAVAILABLE. Employee payroll stays SEPARATE from contractor/freelancer
 * payouts (payouts module) and partner settlements (finance). */
@Module({
  providers: [{ provide: PayrollRulesRegistry, useFactory: () => new PayrollRulesRegistry() }],
  exports: [PayrollRulesRegistry],
})
export class PayrollModule {}