import React from 'react';
import { useI18n } from "@/app/i18n/client";

const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="modal-overlay">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full" data-testid="modal-content">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-left">{title || t("hint")}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto">
          <div className="whitespace-pre-line text-left">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
