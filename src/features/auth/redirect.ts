export function safeNext(value: unknown, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && ![...value].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) && !value.startsWith("/auth") && !value.startsWith("/login")
    ? value : fallback;
}
