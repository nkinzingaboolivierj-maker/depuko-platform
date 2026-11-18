/**
 * Service types the engine must support (§13). Never branch UI/backend logic
 * on a hardcoded per-service name — branch on type + configuration instead.
 */
export enum ServiceType {
  HOURLY = 'hourly',
  DAILY = 'daily',
  FIXED_PRICE = 'fixed_price',
  PER_ITEM = 'per_item',
  PER_PERSON = 'per_person',
  PER_KM = 'per_km',
  PER_M2 = 'per_m2',
  PER_SESSION = 'per_session',
  MILESTONE = 'milestone',
  RECURRING = 'recurring',
  SUBSCRIPTION = 'subscription',
  INSPECTION_FIRST = 'inspection_first',
  CUSTOM_QUOTE = 'custom_quote',
  COMPOSITE = 'composite',
  PRODUCT_AND_SERVICE = 'product_and_service',
}
