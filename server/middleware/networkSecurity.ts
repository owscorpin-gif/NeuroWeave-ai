import { Request, Response, NextFunction } from "express";

/**
 * Network Security Middleware
 * Implements application-level WAF, Bot Detection, and IP Filtering.
 * Designed to complement Google Cloud Armor.
 */

// Simple IP Blacklist (Example)
const IP_BLACKLIST = new Set([
  "1.2.3.4",
  "5.6.7.8"
]);

// Common bot signatures in User-Agent
const BOT_SIGNATURES = [
  "python-requests",
  "curl",
  "wget",
  "headless",
  "phantomjs",
  "selenium",
  "puppeteer",
  "sqlmap",
  "nikto",
  "nmap"
];

// WAF Attack Patterns (Regex)
const ATTACK_PATTERNS = {
  sqlInjection: /\b(union|select|insert|update|delete|drop|truncate|xp_|--)\b/i,
  xss: /(<script|javascript:|onerror=|onload=|eval\(|alert\(|document\.cookie)/i,
  pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
  commandInjection: /(&&|\|\||;|`|\$\(|\b(sh|bash|cmd|powershell|nc|netcat)\b)/i
};

// Bot blocking policy
const BLOCK_BOTS = true;

// Abuse Detection (Simple in-memory store)
const requestCounts = new Map<string, { count: number; lastReset: number }>();
const ABUSE_THRESHOLD = 50; // Max 50 requests per 10 seconds
const ABUSE_WINDOW = 10000; // 10 seconds

export const networkSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "";

  // 1. IP Filtering
  if (IP_BLACKLIST.has(clientIp)) {
    console.warn(`[Network Security] Blocked blacklisted IP: ${clientIp}`);
    return res.status(403).json({ error: "Access Denied: Your IP is blacklisted." });
  }

  // 2. Abuse Detection (Rate limiting per IP)
  const now = Date.now();
  const userData = requestCounts.get(clientIp) || { count: 0, lastReset: now };
  
  if (now - userData.lastReset > ABUSE_WINDOW) {
    userData.count = 1;
    userData.lastReset = now;
  } else {
    userData.count++;
  }
  requestCounts.set(clientIp, userData);

  if (userData.count > ABUSE_THRESHOLD) {
    console.error(`[Network Security] Abuse detected from IP: ${clientIp}`);
    return res.status(429).json({ error: "Too many requests. Potential abuse detected." });
  }

  // 3. Bot Detection
  const isBot = BOT_SIGNATURES.some(sig => userAgent.toLowerCase().includes(sig));
  if (isBot && !req.path.startsWith("/api/health")) {
    console.warn(`[Network Security] Potential bot detected: ${userAgent}`);
    if (BLOCK_BOTS) {
      return res.status(403).json({ error: "Access Denied: Automated requests are not allowed." });
    }
    res.setHeader("X-Bot-Detected", "true");
  }

  // 3. Application-Level WAF (Input Filtering)
  const inputs = [
    JSON.stringify(req.query),
    JSON.stringify(req.body),
    JSON.stringify(req.params),
    userAgent
  ].join(" ");

  for (const [type, pattern] of Object.entries(ATTACK_PATTERNS)) {
    if (pattern.test(inputs)) {
      console.error(`[Network Security] Blocked potential ${type} attack from ${clientIp}`);
      return res.status(400).json({ error: `Security Violation: Potential ${type} detected.` });
    }
  }

  // 4. Cloud Armor Simulation
  // In production, Google Cloud Armor would set these headers
  if (process.env.NODE_ENV !== "production") {
    res.setHeader("X-Cloud-Armor-Status", "Enabled");
    res.setHeader("X-DDoS-Protection", "Active");
  }

  next();
};
