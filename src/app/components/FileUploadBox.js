'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import { useI18n } from '@/app/i18n/client';
import Modal from '@/app/components/Modal';

export default function FileUploadBox({ accept, onChange, title, maxSize = 50, className = '' }) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const showError = (message) => {
    setModalMessage(message);
    setIsModalOpen(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    if (file.size > maxSize * 1024 * 1024) {
      showError(t('fileUpload_sizeExceeded', { size: maxSize }));
      return;
    }
    setFileName(file.name);
    onChange(file);
  };

  return (
    <>
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          hover:border-blue-500 transition-colors duration-200
          flex items-center justify-center
          ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="text-center">
            {title && <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>}
            <p className="text-sm text-gray-600">
              {fileName ? (
                fileName
              ) : (
                <>
                  {t('fileUpload_dragHere')}
                  <span className="text-blue-500">{t('fileUpload_clickUpload')}</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('fileUpload_sizeLimit', {
                accept: accept.split(',').join('/'),
                size: maxSize,
              })}
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p className="text-gray-700">{modalMessage}</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('fileUpload_modal_close')}
          </button>
        </div>
      </Modal>
    </>
  );
}

FileUploadBox.propTypes = {
  accept: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string,
  maxSize: PropTypes.number,
  className: PropTypes.string,
};
