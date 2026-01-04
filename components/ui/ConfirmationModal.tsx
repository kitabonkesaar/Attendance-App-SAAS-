import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: 'edit' | 'delete';
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  isProcessing = false
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Manage Focus Trap & Restoration
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      lastFocusedElement.current = document.activeElement as HTMLElement;
      
      // Move focus to cancel button
      setTimeout(() => {
        cancelRef.current?.focus();
      }, 50);
    } else {
      // Restore focus on close
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDelete = type === 'delete';
  const themeColor = isDelete ? 'rose' : 'blue';

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
    >
      <div 
        className="bg-white w-full max-w-[320px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 scale-100"
        style={{ maxHeight: '300px' }}
      >
        {/* Header Bar */}
        <div className={`h-2 w-full bg-${themeColor}-500`} />

        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`mx-auto mb-4 w-12 h-12 rounded-full bg-${themeColor}-50 flex items-center justify-center`}>
            {isDelete ? (
              <svg className={`w-6 h-6 text-${themeColor}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className={`w-6 h-6 text-${themeColor}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            )}
          </div>

          <h3 id="modal-title" className="text-lg font-black text-gray-900 mb-1">
            {title}
          </h3>
          
          <div id="modal-desc" className="text-xs text-gray-500 font-medium leading-relaxed mb-1">
            {message}
          </div>
          
          {itemName && (
            <div className="text-sm font-bold text-gray-800 bg-gray-50 py-1 px-2 rounded-lg inline-block mb-4 mt-1 border border-gray-100 truncate max-w-full">
              {itemName}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-black uppercase tracking-wider rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-4 py-2.5 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-${themeColor}-200 transition-all active:scale-95 flex items-center justify-center gap-2`}
            >
              {isProcessing ? (
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
