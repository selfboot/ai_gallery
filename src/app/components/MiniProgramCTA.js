"use client";

import { useCallback, useEffect, useId, useState } from "react";
import clsx from "clsx";

export default function MiniProgramCTA({
  buttonLabel,
  buttonMobileLabel,
  modalTitle,
  modalDescription,
  helperText,
  closeLabel,
  imageAlt,
  imageSrc,
  className,
  variant = "primary",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const dialogId = useId();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const buttonClasses = clsx(
    "inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 focus-visible:ring-offset-white",
      light: "bg-white text-blue-600 hover:bg-blue-100 focus-visible:ring-white focus-visible:ring-offset-blue-600/40",
    }[variant] || "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 focus-visible:ring-offset-white"
  );

  return (
    <div className={clsx("relative", className)}>
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(buttonClasses, "w-full sm:w-auto shadow-sm sm:shadow-none")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? dialogId : undefined}
      >
        <span className="sm:hidden">{buttonMobileLabel || buttonLabel}</span>
        <span className="hidden sm:inline">{buttonLabel}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            id={dialogId}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={modalTitleId} className="text-xl font-semibold text-gray-900">
                {modalTitle}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 transition hover:text-gray-600"
                aria-label={closeLabel}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <p id={modalDescriptionId} className="mt-2 text-sm text-gray-600">
              {modalDescription}
            </p>

            <div className="mt-5 overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50">
              <img src={imageSrc} alt={imageAlt || modalTitle} className="w-full object-cover" loading="lazy" />
            </div>

            <a
              href="https://puzzles-game.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-sm font-medium text-blue-600 underline hover:text-blue-700"
            >
              https://puzzles-game.com/
            </a>

            <p className="mt-4 text-xs text-gray-500">{helperText}</p>

            <button
              type="button"
              onClick={handleClose}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
