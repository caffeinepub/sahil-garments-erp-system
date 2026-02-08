/**
 * Utility for detecting and formatting backend insufficient-stock errors
 * into user-friendly English messages.
 */

export interface StockErrorResult {
  isInsufficientStock: boolean;
  message: string;
}

/**
 * Detects if an error is related to insufficient stock and formats it
 * into a clear English message suitable for toast/dialog display.
 */
export function parseStockError(error: unknown): StockErrorResult {
  const defaultResult: StockErrorResult = {
    isInsufficientStock: false,
    message: 'An error occurred',
  };

  if (!error) {
    return defaultResult;
  }

  // Extract error message from various error shapes
  let errorMessage = '';
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as any).message);
  }

  // Normalize to lowercase for matching
  const normalizedMessage = errorMessage.toLowerCase();

  // Check for insufficient stock indicators
  const isInsufficientStock = 
    normalizedMessage.includes('insufficient stock') ||
    normalizedMessage.includes('stock below zero') ||
    normalizedMessage.includes('cannot decrement') ||
    normalizedMessage.includes('not enough stock') ||
    normalizedMessage.includes('stock level') ||
    normalizedMessage.includes('available stock');

  if (isInsufficientStock) {
    // Extract product and quantity info if available
    const stockMatch = errorMessage.match(/current stock:\s*(\d+)/i);
    const requestedMatch = errorMessage.match(/requested quantity:\s*(\d+)/i);
    
    let userMessage = 'Insufficient stock available for this operation.';
    
    if (stockMatch && requestedMatch) {
      userMessage = `Insufficient stock! Only ${stockMatch[1]} units available, but ${requestedMatch[1]} requested.`;
    } else if (errorMessage.length > 0) {
      // Use the original error message if it's descriptive
      userMessage = errorMessage;
    }

    return {
      isInsufficientStock: true,
      message: userMessage,
    };
  }

  // Return the original error message for non-stock errors
  return {
    isInsufficientStock: false,
    message: errorMessage || 'An unexpected error occurred',
  };
}
