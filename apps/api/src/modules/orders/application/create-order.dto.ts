/** Manual DTO validation (no new runtime dependency). */
export interface CreateOrderDto {
  serviceDefinitionId?: unknown;
  serviceVersionId?: unknown;
  priceCents?: unknown;
  currency?: unknown;
  idempotencyKey?: unknown;
}

export function validateCreateOrderDto(body: CreateOrderDto): string[] {
  const errors: string[] = [];
  if (typeof body.serviceDefinitionId !== "string" || body.serviceDefinitionId.length === 0) errors.push("serviceDefinitionId must be a non-empty string");
  if (typeof body.serviceVersionId !== "string" || body.serviceVersionId.length === 0) errors.push("serviceVersionId must be a non-empty string");
  if (typeof body.priceCents !== "number" || !Number.isInteger(body.priceCents) || body.priceCents <= 0) errors.push("priceCents must be a positive integer (minor units)");
  if (body.currency !== undefined && (typeof body.currency !== "string" || body.currency.length !== 3)) errors.push("currency must be a 3-letter code when provided");
  if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8) errors.push("idempotencyKey must be a string of at least 8 characters");
  return errors;
}