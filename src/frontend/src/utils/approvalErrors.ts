/**
 * Utility for normalizing and extracting user-friendly error messages from backend approval/user-management operations.
 * Handles authorization failures, missing profile setup, rejection states, and profile save errors with clear English messaging and comprehensive logging for debugging approval request issues.
 */

export interface ApprovalErrorInfo {
  type: 'authorization' | 'missing-profile' | 'rejected' | 'role-restriction' | 'validation' | 'network' | 'unknown';
  message: string;
  backendMessage?: string;
}

/**
 * Parse backend error and extract a user-friendly English message for approval operations
 */
export function parseApprovalError(error: any): ApprovalErrorInfo {
  console.group('[Error Parser] parseApprovalError');
  console.log('[Error Parser] Input error:', error);
  console.log('[Error Parser] Error type:', typeof error);
  console.log('[Error Parser] Error message:', error?.message);
  
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();
  
  console.log('[Error Parser] Normalized message:', errorMessage);
  console.log('[Error Parser] Lowercase message:', lowerMessage);

  // Check for network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    console.log('[Error Parser] Detected: network error');
    console.groupEnd();
    return {
      type: 'network',
      message: 'Network error. Please check your connection and try again.',
      backendMessage: errorMessage,
    };
  }

  // Check for authorization/secondary admin errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('only primary') ||
    lowerMessage.includes('secondary admin') ||
    lowerMessage.includes('primary admin privileges') ||
    lowerMessage.includes('only admins can') ||
    lowerMessage.includes('permission')
  ) {
    console.log('[Error Parser] Detected: authorization error');
    console.groupEnd();
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
    console.log('[Error Parser] Detected: missing profile');
    console.groupEnd();
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
    console.log('[Error Parser] Detected: rejection error');
    console.groupEnd();
    return {
      type: 'rejected',
      message: 'Your account has been rejected. Please contact an administrator for assistance.',
      backendMessage: errorMessage,
    };
  }

  // Check for actor/authentication errors
  if (
    lowerMessage.includes('actor not available') ||
    lowerMessage.includes('authentication required')
  ) {
    console.log('[Error Parser] Detected: authentication error');
    console.groupEnd();
    return {
      type: 'unknown',
      message: 'Authentication error. Please try logging in again.',
      backendMessage: errorMessage,
    };
  }

  // Unknown error
  console.log('[Error Parser] Detected: unknown error');
  console.groupEnd();
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    backendMessage: errorMessage,
  };
}

/**
 * Parse profile save errors with specific handling for role restrictions
 */
export function parseProfileSaveError(error: any): ApprovalErrorInfo {
  console.group('[Error Parser] parseProfileSaveError');
  console.log('[Error Parser] Input error:', error);
  console.log('[Error Parser] Error type:', typeof error);
  console.log('[Error Parser] Error constructor:', error?.constructor?.name);
  console.log('[Error Parser] Error message:', error?.message);
  console.log('[Error Parser] Error toString:', error?.toString());
  
  const errorMessage = error?.message || error?.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();
  
  console.log('[Error Parser] Normalized message:', errorMessage);
  console.log('[Error Parser] Lowercase message:', lowerMessage);

  // Check for network errors first
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    console.log('[Error Parser] Detected: network error');
    console.groupEnd();
    return {
      type: 'network',
      message: 'Network error. Please check your connection and try again.',
      backendMessage: errorMessage,
    };
  }

  // Check for role assignment restrictions
  if (
    lowerMessage.includes('cannot self-assign admin role') ||
    lowerMessage.includes('cannot self-assign privileged roles') ||
    lowerMessage.includes('cannot change app roles') ||
    lowerMessage.includes('only admins can assign') ||
    lowerMessage.includes('only admins can change app roles') ||
    lowerMessage.includes('request role assignment from an admin')
  ) {
    console.log('[Error Parser] Detected: role restriction error');
    console.groupEnd();
    return {
      type: 'role-restriction',
      message: 'You cannot assign privileged roles to yourself during profile creation. Please create your profile first, then contact an administrator to assign the appropriate role.',
      backendMessage: errorMessage,
    };
  }

  // Check for validation errors
  if (
    lowerMessage.includes('required') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('must provide')
  ) {
    console.log('[Error Parser] Detected: validation error');
    console.groupEnd();
    return {
      type: 'validation',
      message: errorMessage || 'Please fill in all required fields correctly.',
      backendMessage: errorMessage,
    };
  }

  // Check for authorization errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('permission') ||
    lowerMessage.includes('only users can')
  ) {
    console.log('[Error Parser] Detected: authorization error');
    console.groupEnd();
    return {
      type: 'authorization',
      message: 'You do not have permission to save this profile. Please ensure you are logged in.',
      backendMessage: errorMessage,
    };
  }

  // Check for actor/authentication errors
  if (
    lowerMessage.includes('actor not available') ||
    lowerMessage.includes('authentication required')
  ) {
    console.log('[Error Parser] Detected: authentication error');
    console.groupEnd();
    return {
      type: 'unknown',
      message: 'Authentication error. Please try logging in again.',
      backendMessage: errorMessage,
    };
  }

  // Return the actual backend error message if it's descriptive
  if (errorMessage && errorMessage.length > 10) {
    console.log('[Error Parser] Using backend error message directly');
    console.groupEnd();
    return {
      type: 'unknown',
      message: errorMessage,
      backendMessage: errorMessage,
    };
  }

  // Unknown error
  console.log('[Error Parser] Detected: unknown error (no specific pattern matched)');
  console.groupEnd();
  return {
    type: 'unknown',
    message: 'Failed to save profile. Please try again or contact support.',
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

/**
 * Check if an error indicates role restriction
 */
export function isRoleRestrictionError(error: any): boolean {
  const errorInfo = parseProfileSaveError(error);
  return errorInfo.type === 'role-restriction';
}

/**
 * Check if an error indicates network failure
 */
export function isNetworkError(error: any): boolean {
  const errorInfo = parseApprovalError(error);
  return errorInfo.type === 'network';
}
