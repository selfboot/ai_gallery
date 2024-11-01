import { useState, useCallback } from 'react';
import Modal from '@/app/components/Modal';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const handleError = useCallback((error) => {
    let message = error.message;
    setError(message);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const errorModal = error ? (
    <Modal isOpen={true} onClose={clearError}>
      {error}
    </Modal>
  ) : null;

  return {
    handleError,
    clearError,
    errorModal,
  };
};
