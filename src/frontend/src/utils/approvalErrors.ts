/**
 * Utility for normalizing and extracting user-friendly error messages from backend approval/user-management operations.
 * Handles authorization failures, missing profile setup, and rejection states with clear English messaging.
 */

export interface ApprovalErrorInfo {
  type: 'authorization' | 'missing-profile' | 'rejected' | 'unknown';
  message: string;
  backendMessage?: string;
}

/**
 * Parse backend error and extract a user-friendly English message for approval operations
 */
export function parseApprovalError(error: any): ApprovalErrorInfo {
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();

  // Check for authorization/secondary admin errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('only primary') ||
    lowerMessage.includes('secondary admin') ||
    lowerMessage.includes('primary admin privileges')
  ) {
    return {
      type: 'authorization',
      message: 'You do not have permission to perform this action. Only primary administrators can manage user approvals.',
      backendMessage: errorMessage,
    };
  }

  // Check for missing profile setup
  if (
    lowerMessage.includes('profile not found') ||
    lowerMessage.includes('complete profile setup') ||
    lowerMessage.includes('user must complete profile')
  ) {
    return {
      type: 'missing-profile',
      message: 'This user must complete their profile setup before their approval status can be changed.',
      backendMessage: errorMessage,
    };
  }

  // Check for rejection-related errors
  if (
    lowerMessage.includes('rejected') ||
    lowerMessage.includes('account has been rejected')
  ) {
    return {
      type: 'rejected',
      message: 'Your account has been rejected. Please contact an administrator for assistance.',
      backendMessage: errorMessage,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    backendMessage: errorMessage,
  };
}

/**
 * Check if an error indicates the user has been rejected
 */
export function isRejectedError(error: any): boolean {
  const errorInfo = parseApprovalError(error);
  return errorInfo.type === 'rejected';
}

/**
 * Check if an error indicates authorization failure
 */
export function isAuthorizationError(error: any): boolean {
  const errorInfo = parseApprovalError(error);
  return errorInfo.type === 'authorization';
}
