/**
 * Undo/Redo Manager
 * Implements command pattern for undoable operations
 */

const UndoRedoManager = (() => {
  'use strict';

  const MAX_HISTORY_SIZE = 50;
  const history = [];
  let currentIndex = -1;

  /**
   * Command interface
   * All commands must implement: execute(), undo(), description
   */

  /**
   * Add command to history
   */
  const execute = (command) => {
    try {
      command.execute();

      // Add to history
      history = history.slice(0, historyIndex + 1); // Remove any forward history
      history.push(command);

      if (history.length > MAX_HISTORY) {
        history.shift();
      } else {
        historyIndex++;
      }

      if (typeof UIFeedback !== 'undefined' && !command.silent) {
        UIFeedback.showToast(`${command.description || 'Action'} completed`, 'info', { duration: 2000 });
      }
    } catch (error) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(error, {
          category: ErrorHandler.ErrorCategory.SYSTEM,
          customMessage: 'Could not execute command'
        });
      }
    }
  };

  /**
   * Undo last action
   */
  const undo = () => {
    if (!canUndo()) {
      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.showToast('Nothing to undo', 'info');
      }
      return;
    }

    const command = commandHistory[currentIndex];
    try {
      command.undo();
      currentIndex--;
      console.log('[UndoRedo] Undo executed:', command.name);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.showToast(`Undid: ${command.name}`, 'info');
      }
    } catch (error) {
      console.error('[UndoRedo] Undo failed:', error);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(error, {
          category: ErrorHandler.ErrorCategory.SYSTEM,
          customMessage: 'Could not undo action'
        });
      }
    }
  };

  /**
   * Redo last undone command
   */
  const redo = () => {
    if (currentIndex >= history.length - 1) {
      console.warn('[UndoRedo] Nothing to redo');
      return;
    }

    currentIndex++;
    const command = history[currentIndex];

    try {
      command.execute();
      console.log('[UndoRedo] Redo:', command.name);

      if (typeof UIFeedback !== 'undefined') {
        UIFeedback.showToast(`Redone: ${command.description || 'Action'}`, 'info', { duration: 2000 });
      }
    } catch (error) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleError(error, {
          category: ErrorHandler.ErrorCategory.SYSTEM,
          customMessage: 'Could not redo action'
        });
      }
    }
  };

  /**
   * Check if undo is available
   */
  const canUndo = () => {
    return historyIndex >= 0;
  };

  /**
   * Check if redo is available
   */
  const canRedo = () => {
    return historyIndex < history.length - 1;
  };

  /**
   * Clear history
   */
  const clearHistory = () => {
    history.length = 0;
    historyIndex = -1;
    console.log('[UndoRedo] History cleared');
  };

  /**
   * Get history size
   */
  const getHistorySize = () => {
    return history.length;
  };

  /**
   * Get current history (for debugging)
   */
  const getHistory = () => {
    return [...history];
  };

  // Public API
  return {
    registerCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistory
  };
})();

// Export for browser global scope
window.UndoRedoManager = UndoRedoManager;
