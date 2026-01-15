/**
 * Comprehensive Error Handling System
 * Catches errors, logs them, and shows user-friendly messages
 */

const ErrorHandler = (() => {
  'use strict';

  // Error categories
  const ErrorCategory = {
    STORAGE: 'storage',
    NETWORK: 'network',
    VALIDATION: 'validation',
    FILE_IO: 'file_io',
    CALCULATION: 'calculation',
    USER_INPUT: 'user_input',
    SYSTEM: 'system',
    UNKNOWN: 'unknown'
  };

  // Error severity levels
  const ErrorSeverity = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
  };

  // Error log storage (keep last 100 errors)
  const errorLog = [];
  const MAX_LOG_SIZE = 100;

  /**
   * Log error to console and internal storage
   */
  const logError = (error, category, severity, context = {}) => {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack || null,
      category: category || ErrorCategory.UNKNOWN,
      severity: severity || ErrorSeverity.ERROR,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to log
    errorLog.push(errorEntry);
    if (errorLog.length > MAX_LOG_SIZE) {
      errorLog.shift(); // Remove oldest
    }

    // Console logging with appropriate level
    const consoleMethod = severity === ErrorSeverity.CRITICAL ? 'error' :
                         severity === ErrorSeverity.ERROR ? 'error' :
                         severity === ErrorSeverity.WARNING ? 'warn' : 'info';

    console[consoleMethod](`[${category.toUpperCase()}] ${errorEntry.message}`, {
      ...context,
      stack: errorEntry.stack
    });

    // Save to localStorage for desktop app debugging
    try {
      localStorage.setItem('cots_last_error', JSON.stringify(errorEntry));
      const savedLog = JSON.parse(localStorage.getItem('cots_error_log') || '[]');
      savedLog.push(errorEntry);
      if (savedLog.length > 50) savedLog.shift();
      localStorage.setItem('cots_error_log', JSON.stringify(savedLog));
    } catch (e) {
      // Storage might be full or unavailable
      console.warn('[ErrorHandler] Could not save error to localStorage:', e);
    }

    return errorEntry;
  };

  /**
   * Get user-friendly error message
   */
  const getUserFriendlyMessage = (error, category) => {
    // Check for specific error patterns
    const message = error.message || String(error);

    if (category === ErrorCategory.STORAGE) {
      if (message.includes('quota') || message.includes('QuotaExceededError')) {
        return 'Storage is full. Please export your data and clear old projects to free up space.';
      }
      return 'Could not save data to local storage. Your changes may not be saved.';
    }

    if (category === ErrorCategory.NETWORK) {
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return 'Network request failed. If you\'re in offline mode, this is expected. Some features require internet connection.';
      }
      return 'Network error occurred. Please check your connection and try again.';
    }

    if (category === ErrorCategory.FILE_IO) {
      if (message.includes('not found')) {
        return 'File not found. Please select a valid file and try again.';
      }
      if (message.includes('parse') || message.includes('format')) {
        return 'File format is invalid or corrupted. Please check the file and try again.';
      }
      return 'Could not read file. Please check the file format and try again.';
    }

    if (category === ErrorCategory.VALIDATION) {
      return message; // Validation errors are usually user-friendly already
    }

    if (category === ErrorCategory.CALCULATION) {
      return 'Calculation error occurred. Please check your input values and try again.';
    }

    if (category === ErrorCategory.USER_INPUT) {
      return message; // User input errors should be specific
    }

    if (category === ErrorCategory.SYSTEM) {
      return 'System error occurred. Please try refreshing the application.';
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again or refresh the application.';
  };

  /**
   * Handle error with user notification
   */
  const handleError = (error, options = {}) => {
    const {
      category = ErrorCategory.UNKNOWN,
      severity = ErrorSeverity.ERROR,
      context = {},
      showToUser = true,
      customMessage = null,
      action = null
    } = options;

    // Log the error
    const errorEntry = logError(error, category, severity, context);

    // Show to user if requested
    if (showToUser && typeof UIFeedback !== 'undefined') {
      const friendlyMessage = customMessage || getUserFriendlyMessage(error, category);

      // Determine toast type based on severity
      const toastType = severity === ErrorSeverity.CRITICAL ? 'error' :
                       severity === ErrorSeverity.ERROR ? 'error' :
                       severity === ErrorSeverity.WARNING ? 'warning' : 'info';

      UIFeedback.showToast(friendlyMessage, toastType, {
        duration: severity === ErrorSeverity.CRITICAL ? 0 : 5000, // Critical errors don't auto-dismiss
        action: action
      });
    }

    return errorEntry;
  };

  /**
   * Wrap async function with error handling
   */
  const wrapAsync = (fn, options = {}) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, {
          category: options.category || ErrorCategory.UNKNOWN,
          severity: options.severity || ErrorSeverity.ERROR,
          context: {
            function: fn.name || 'anonymous',
            args: options.logArgs ? args : undefined,
            ...options.context
          },
          showToUser: options.showToUser !== false,
          customMessage: options.customMessage
        });

        // Re-throw if specified
        if (options.rethrow) {
          throw error;
        }

        // Return default value if specified
        if (options.defaultValue !== undefined) {
          return options.defaultValue;
        }

        return null;
      }
    };
  };

  /**
   * Wrap synchronous function with error handling
   */
  const wrapSync = (fn, options = {}) => {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        handleError(error, {
          category: options.category || ErrorCategory.UNKNOWN,
          severity: options.severity || ErrorSeverity.ERROR,
          context: {
            function: fn.name || 'anonymous',
            args: options.logArgs ? args : undefined,
            ...options.context
          },
          showToUser: options.showToUser !== false,
          customMessage: options.customMessage
        });

        if (options.rethrow) {
          throw error;
        }

        if (options.defaultValue !== undefined) {
          return options.defaultValue;
        }

        return null;
      }
    };
  };

  /**
   * Get error log
   */
  const getErrorLog = () => {
    return [...errorLog];
  };

  /**
   * Clear error log
   */
  const clearErrorLog = () => {
    errorLog.length = 0;
    try {
      localStorage.removeItem('cots_error_log');
      localStorage.removeItem('cots_last_error');
    } catch (e) {
      console.warn('[ErrorHandler] Could not clear error log from localStorage');
    }
  };

  /**
   * Download error log as JSON file
   */
  const downloadErrorLog = () => {
    try {
      const logData = {
        exported: new Date().toISOString(),
        appVersion: document.getElementById('appVersionBadge')?.textContent || 'unknown',
        userAgent: navigator.userAgent,
        errors: errorLog
      };

      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cots-architect-error-log-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.showToast('Error log downloaded successfully', 'success');
      }
    } catch (error) {
      console.error('[ErrorHandler] Could not download error log:', error);
    }
  };

  /**
   * Install global error handlers
   */
  const installGlobalHandlers = () => {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      handleError(event.error || new Error(event.message), {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        showToUser: true,
        customMessage: 'A critical error occurred. Please refresh the application.'
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason || new Error('Unhandled promise rejection'), {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.ERROR,
        context: {
          promise: event.promise
        },
        showToUser: true
      });
    });

    console.log('[ErrorHandler] Global error handlers installed');
  };

  // Public API
  return {
    ErrorCategory,
    ErrorSeverity,
    handleError,
    logError,
    wrapAsync,
    wrapSync,
    getErrorLog,
    clearErrorLog,
    downloadErrorLog,
    installGlobalHandlers,
    getUserFriendlyMessage
  };
})();

// Export for browser global scope
window.ErrorHandler = ErrorHandler;

// Auto-install global handlers
if (typeof window !== 'undefined') {
  ErrorHandler.installGlobalHandlers();
}
