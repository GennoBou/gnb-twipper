export function extractUsername(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/^\/+|\/+$/g, "");
      return path.split("/")[0].toLowerCase();
    }
    if (trimmed.includes("twitch.tv/")) {
      const parts = trimmed.split("twitch.tv/");
      return parts[1]
        .replace(/^\/+|\/+$/g, "")
        .split("/")[0]
        .toLowerCase();
    }
  } catch (e) {}
  return trimmed.replace(/^@/, "").toLowerCase();
}
