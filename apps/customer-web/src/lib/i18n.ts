/** Kinyarwanda / English / French (S19). Language is a first-class UI
 * setting; every customer-visible string routes through t(). Missing keys
 * fall back to English - never to a blank screen. */
export type Lang = "en" | "rw" | "fr";

const STRINGS: Record<string, Record<Lang, string>> = {
  "home.hero": {
    en: "What do you need done?",
    rw: "Ushaka iki kibasirwe?",
    fr: "De quoi avez-vous besoin ?",
  },
  "home.search": {
    en: "Find providers",
    rw: "Shakisha abakora",
    fr: "Trouver des prestataires",
  },
  "home.placeholder": {
    en: "Describe it in your own words...",
    rw: "Sobanura mu mvugo yawe...",
    fr: "Decrivez-le avec vos mots...",
  },
  "orders.title": {
    en: "Your orders",
    rw: "Ibicuruzwa byawe",
    fr: "Vos commandes",
  },
  "orders.empty": {
    en: "No orders yet. Start with what you need done.",
    rw: "Nta mbifatanije. Tangira n\u2019icyo ushaka.",
    fr: "Aucune commande. Commencez par votre besoin.",
  },
  "auth.login": { en: "Sign in", rw: "Injira", fr: "Se connecter" },
  "auth.register": { en: "Create account", rw: "Funga konti", fr: "Creer un compte" },
  "auth.logout": { en: "Sign out", rw: "Sohoka", fr: "Se deconnecter" },
  "support.title": { en: "Support", rw: "Ubufasha", fr: "Assistance" },
  "errors.network": {
    en: "Network error - cannot reach the DEPUKO API.",
    rw: "Ikibazo cya interineti - n\u2019ishobora kugera kuri DEPUKO.",
    fr: "Erreur reseau - impossible d\u2019atteindre l\u2019API DEPUKO.",
  },
};

export function makeT(lang: Lang) {
  return (key: string): string => {
    const entry = STRINGS[key];
    if (!entry) return key; // never blank; keys are honest
    return entry[lang] ?? entry.en;
  };
}