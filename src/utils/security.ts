import DOMPurify from "dompurify";
import xss from "xss";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Primarily for client-side rendering.
 */
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html);
};

/**
 * Sanitizes plain text to prevent script injection and other malicious inputs.
 * Useful for prompts and user messages.
 */
export const sanitizeText = (text: string): string => {
  // Remove any potential script tags or dangerous patterns
  let sanitized = xss(text);
  
  // Neutralize common prompt injection keywords if they look suspicious
  const suspiciousPatterns = [
    /ignore previous instructions/gi,
    /system prompt/gi,
    /you are now/gi,
    /bypass/gi,
    /forget everything/gi,
    /new rules/gi,
    /stop following/gi,
    /as an unrestricted/gi,
    /do anything now/gi,
    /stay in character/gi,
    /developer mode/gi,
    /jailbreak/gi,
    /unfiltered/gi
  ];
  
  suspiciousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  });

  return sanitized;
};

/**
 * Structured Prompt Guard to prevent injection.
 */
export class PromptGuard {
  /**
   * Wraps user input in a structured format.
   */
  static wrapUserPrompt(userInput: string): string {
    const sanitizedInput = sanitizeText(userInput);
    return `USER MESSAGE: ${sanitizedInput}`;
  }

  /**
   * Validates if a prompt contains high-risk injection attempts or abuse patterns.
   */
  static isMalicious(prompt: string): boolean {
    const highRiskPatterns = [
      /DAN mode/i,
      /jailbreak/i,
      /unfiltered/i,
      /ignore all previous/i,
      /output the system prompt/i,
      /reveal your instructions/i,
      /what is your system prompt/i,
      /bypass safety/i,
      /unrestricted access/i,
      /generate harmful content/i,
      /how to build a bomb/i,
      /illegal activities/i
    ];
    
    // Check for repetitive character patterns (bot-like behavior)
    const isRepetitive = /(.)\1{10,}/.test(prompt);
    
    // Check for extremely long strings without spaces
    const hasLongWords = prompt.split(/\s+/).some(word => word.length > 50);

    return highRiskPatterns.some(pattern => pattern.test(prompt)) || isRepetitive || hasLongWords;
  }
}

/**
 * AI Usage Limiter (Client-side simulation)
 */
export class AIUsageTracker {
  private static requests: number[] = [];
  private static readonly LIMIT = 10; // 10 requests
  private static readonly WINDOW = 60 * 1000; // per minute

  static canRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.WINDOW);
    
    if (this.requests.length >= this.LIMIT) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  static getRemaining(): number {
    const now = Date.now();
    const active = this.requests.filter(time => now - time < this.WINDOW).length;
    return Math.max(0, this.LIMIT - active);
  }
}

/**
 * Validates a file against size and type constraints.
 * Restrictive: only allows jpg, png, pdf.
 */
export const validateFile = (file: File, maxSizeMB: number = 5, allowedTypes: string[] = ["image/jpeg", "image/png", "application/pdf"]): { valid: boolean; error?: string } => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit.` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    const typesList = allowedTypes.map(t => {
      const ext = t.split('/')[1].toUpperCase();
      return ext === 'QUICKTIME' ? 'MOV' : ext;
    }).join(", ");
    return { valid: false, error: `Unsupported file type. Allowed types: ${typesList}` };
  }
  
  return { valid: true };
};

/**
 * Scans a file for potential malware signatures (Simulation).
 * In a production environment, this would call a service like Google Cloud Web Risk or VirusTotal.
 */
export const scanFileForMalware = async (file: File): Promise<{ safe: boolean; error?: string }> => {
  // Simulate a scan delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Basic check for suspicious extensions or double extensions
  const suspiciousExtensions = [".exe", ".bat", ".sh", ".js", ".vbs", ".php"];
  const fileName = file.name.toLowerCase();
  
  if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
    return { safe: false, error: "Malicious file signature detected." };
  }

  // Check for double extensions (e.g., image.jpg.exe)
  const parts = fileName.split(".");
  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    if (suspiciousExtensions.includes(`.${lastPart}`) || suspiciousExtensions.includes(`.${secondLastPart}`)) {
      return { safe: false, error: "Suspicious file naming pattern detected." };
    }
  }

  return { safe: true };
};
