/**
 * Centralized error handling utility for NeuroWeave AI.
 * Maps technical errors to user-friendly messages and provides resolution guidance.
 */

export enum ErrorCode {
  SAFETY_BLOCKED = "SAFETY_BLOCKED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NETWORK_ERROR = "NETWORK_ERROR",
  API_KEY_INVALID = "API_KEY_INVALID",
  MALICIOUS_PROMPT = "MALICIOUS_PROMPT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  AUTH_REQUIRED = "AUTH_REQUIRED",
  PERMISSION_DENIED = "PERMISSION_DENIED",
}

interface UserFriendlyError {
  code: ErrorCode;
  message: string;
  guidance: string;
}

export const mapErrorToUserFriendly = (error: any): UserFriendlyError => {
  const message = error?.message || String(error);
  
  if (message.includes("SAFETY") || message === "RESPONSE_BLOCKED_SAFETY") {
    return {
      code: ErrorCode.SAFETY_BLOCKED,
      message: "Content Blocked by Safety Filters",
      guidance: "Your prompt or the generated content triggered our safety filters. Please try rephrasing your request to be more neutral."
    };
  }

  if (message.includes("quota") || message.includes("429") || message.includes("Usage limit")) {
    return {
      code: ErrorCode.QUOTA_EXCEEDED,
      message: "AI Usage Limit Reached",
      guidance: "You've reached the temporary usage limit for the AI models. Please wait a few minutes before trying again."
    };
  }

  if (message.includes("API_KEY") || message.includes("key not found") || message.includes("401")) {
    return {
      code: ErrorCode.API_KEY_INVALID,
      message: "API Configuration Issue",
      guidance: "There's an issue with the AI service configuration. If you're using a custom key, please check it in Settings."
    };
  }

  if (message.includes("Security Alert") || message.includes("Malicious")) {
    return {
      code: ErrorCode.MALICIOUS_PROMPT,
      message: "Security Policy Violation",
      guidance: "Our security engine detected a potentially harmful pattern in your prompt. Please ensure your request follows our usage policies."
    };
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("Failed to fetch")) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: "Connection Interrupted",
      guidance: "We're having trouble reaching the AI servers. Please check your internet connection and try again."
    };
  }

  if (message.includes("permission") || message.includes("insufficient permissions")) {
    return {
      code: ErrorCode.PERMISSION_DENIED,
      message: "Access Denied",
      guidance: "You don't have the required permissions to perform this action. Please contact an administrator if you believe this is an error."
    };
  }

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: "Intelligence Engine Error",
    guidance: "An unexpected error occurred within the AI processing pipeline. We've logged this and are looking into it."
  };
};
