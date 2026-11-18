export interface TemplateField { id: string; label: string; component: string; required?: boolean }
export interface TemplateSection { id: string; fields: TemplateField[] }
export interface BusinessTemplate {
  id: string; label: string; capabilities: string[]; workspaceModules: string[];
  sensitiveModules: Record<string, string[]>; requiredDocuments: string[];
  pricingModels: string[]; sections: TemplateSection[];
}
const templates = new Map<string, BusinessTemplate>();

export function registerBusinessTemplate(template: BusinessTemplate): void {
  if (!template.id || !template.label || !Array.isArray(template.sections)) throw new Error("invalid business template");
  if (templates.has(template.id)) throw new Error(`business template already exists: ${template.id}`);
  templates.set(template.id, structuredClone(template));
}
export function getBusinessTemplate(id: string): BusinessTemplate | null {
  const value = templates.get(id);
  return value ? structuredClone(value) : null;
}
export function listBusinessTemplates(): BusinessTemplate[] {
  return [...templates.values()].map((value) => structuredClone(value));
}

for (const value of [
  { id: "cleaning", label: "Cleaning", capabilities: ["cleaning"], workspaceModules: ["dashboard", "services", "orders", "staff"], sensitiveModules: { finance: ["owner", "finance"] }, requiredDocuments: ["business_registration"], pricingModels: ["fixed_price", "hourly"], sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }] },
  { id: "restaurant", label: "Restaurant", capabilities: ["food_service"], workspaceModules: ["dashboard", "services", "orders", "inventory", "staff"], sensitiveModules: { finance: ["owner", "finance"] }, requiredDocuments: ["business_registration"], pricingModels: ["fixed_price"], sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }] },
  { id: "construction", label: "Construction", capabilities: ["construction"], workspaceModules: ["dashboard", "services", "projects", "staff", "assets"], sensitiveModules: { finance: ["owner", "finance"] }, requiredDocuments: ["business_registration"], pricingModels: ["fixed_price", "milestone"], sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }] },
  { id: "film", label: "Film production", capabilities: ["film_production"], workspaceModules: ["dashboard", "services", "projects", "staff", "assets"], sensitiveModules: { finance: ["owner", "finance"] }, requiredDocuments: ["business_registration"], pricingModels: ["fixed_price", "milestone"], sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }] },
  { id: "transport", label: "Transport", capabilities: ["transport"], workspaceModules: ["dashboard", "services", "orders", "assets", "staff"], sensitiveModules: { finance: ["owner", "finance"] }, requiredDocuments: ["business_registration"], pricingModels: ["fixed_price", "per_distance"], sections: [{ id: "identity", fields: [{ id: "legal_name", label: "Legal name", component: "TEXT", required: true }] }] },
] as BusinessTemplate[]) registerBusinessTemplate(value);
