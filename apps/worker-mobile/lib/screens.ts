/**
 * Screen registry for the worker app (V7.2). Each entry names the real API
 * endpoints its screen consumes. Screens without backend support display
 * "requires connectivity / module not yet available" - never fake data.
 */
export interface ScreenDef {
  name: string;
  endpoints: string[];
  offlineCapable: boolean;
}

export const WORKER_SCREENS: ScreenDef[] = [
  { name: "Profile", endpoints: ["GET /workforce/me/profile", "POST /workforce/me/profile"], offlineCapable: false },
  { name: "Skills", endpoints: ["POST /skills/claims", "POST /skills/claims/evidence"], offlineCapable: false },
  { name: "Opportunities", endpoints: ["POST /opportunities/:id/applications"], offlineCapable: false },
  { name: "Assignments", endpoints: ["GET /assignments/mine", "POST /assignments/:id/accept"], offlineCapable: true },
  { name: "Check-in/out", endpoints: ["POST /assignments/:id/check-in", "POST /assignments/:id/check-out"], offlineCapable: false },
  { name: "Earnings", endpoints: ["GET /payments/intents/:id/refunds"], offlineCapable: false },
  { name: "Safety", endpoints: ["POST /trust/cases (kind: safety_incident)"], offlineCapable: true },
  { name: "Support", endpoints: ["POST /support/tickets"], offlineCapable: true },
];