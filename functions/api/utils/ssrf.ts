// SSRF host validation for server-side outbound fetches (metadata scraping).
// Extracted from the endpoint so the rules can be unit-tested directly.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
]);

export function isBlockedIPv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  if (a === 0) return true; // "this network" incl. 0.0.0.0
  if (a === 10) return true; // RFC1918 private
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 (cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 private
  if (a === 192 && b === 168) return true; // RFC1918 private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking 198.18/15
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

export function isBlockedIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::" || h === "::1") return true;

  // Embedded IPv4 (e.g. ::ffff:127.0.0.1) — validate the v4 part.
  const v4 = h.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    const parts = v4[1].split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => n <= 255)) return isBlockedIPv4(parts);
  }

  // Loopback written longhand (0:0:...:1)
  const groups = h.split(":").filter((g) => g !== "");
  if (
    groups.length > 0 &&
    groups[groups.length - 1] === "1" &&
    groups.every((g) => /^0{1,4}$/.test(g) || g === "1")
  ) {
    return true;
  }

  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  return false;
}

// inet_aton shorthand: "127.1" → 127.0.0.1, "10.513" → 10.0.2.1. All labels
// before the last take one byte; the last fills the remaining bytes.
export function expandDecimalHost(host: string): number[] | null {
  const labels = host.split(".").map(Number);
  const n = labels.length;
  if (n > 4 || labels.some((v) => !Number.isInteger(v))) return null;
  if (labels.slice(0, -1).some((v) => v > 255)) return null;
  const remaining = 5 - n;
  const last = labels[n - 1];
  if (last > 2 ** (8 * remaining) - 1) return null;
  const bytes = labels.slice(0, -1);
  for (let i = remaining - 1; i >= 0; i--) {
    bytes.push((last >> (8 * i)) & 255);
  }
  return bytes;
}

export function isBlockedHost(rawHostname: string): boolean {
  const host = rawHostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  // Hex IP encoding ("0x7f.1") — never a real domain name.
  if (/(^|\.)0x/i.test(host)) return true;

  const bare = host.replace(/^\[|\]$/g, "");
  if (bare.includes(":")) return isBlockedIPv6(bare);

  if (/^\d+(\.\d+)*$/.test(bare)) {
    // Leading-zero labels are octal IP encodings ("0177.0.0.1" = 127.0.0.1)
    // and never occur in real domain names.
    if (/(^|\.)0\d/.test(bare)) return true;
    const parts = expandDecimalHost(bare);
    if (parts && parts.length === 4) return isBlockedIPv4(parts);
  }
  return false;
}
