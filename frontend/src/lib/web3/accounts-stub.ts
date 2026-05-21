// Empty stub for wagmi's optional "accounts" dependency (tempo smart-account
// connector). We don't use smart accounts; this prevents Turbopack from failing
// the static module resolution on an unused dynamic import.
export const Provider = {
  create: () => {
    throw new Error("accounts module is not available");
  },
};
