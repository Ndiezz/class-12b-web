let fallbackClientId: string | null = null;

export function getOrCreateClientId(): string {
  try {
    let clientId = localStorage.getItem("local_user_id");
    if (!clientId) {
      clientId = "u_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem("local_user_id", clientId);
    }
    return clientId;
  } catch {
    if (!fallbackClientId) {
      fallbackClientId = "u_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    }
    return fallbackClientId;
  }
}
