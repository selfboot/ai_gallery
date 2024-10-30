'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';

export default function FileUploadBox({ accept, onChange, title, maxSize = 50, className = '' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

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
      alert(`文件大小不能超过 ${maxSize}MB`);
      return;
    }
    setFileName(file.name);
    onChange(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        hover:border-blue-500 transition-colors duration-200
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
                将文件拖到此处，或<span className="text-blue-500">点击上传</span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            仅支持{accept.split(',').join('/')}文件，且不超过{maxSize}MB
          </p>
        </div>
      </div>
    </div>
  );
}

FileUploadBox.propTypes = {
  accept: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string,
  maxSize: PropTypes.number,
  className: PropTypes.string,
};
