export type PreferredLanguage = "en" | "rw" | "fr";
export class CustomerProfile {
  constructor(public readonly userId: string, public displayName: string, public country: string, public preferredLanguage: PreferredLanguage = "en") {
    if (!userId || !displayName.trim() || !/^[A-Z]{2}$/.test(country)) throw new Error("invalid customer profile");
  }
}
