import React, { useState, useRef, useEffect } from "react";

export interface PopconfirmProps {
  title: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  children: React.ReactNode;
}

export const Popconfirm: React.FC<PopconfirmProps> = ({
  title,
  onConfirm,
  onCancel,
  okText = "Yes",
  cancelText = "No",
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(true);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    if (onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: any) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setVisible(false);
      }
    };

    if (visible) {
      document.addEventListener("click", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [visible]);

  return (
    <div className="inline-block relative" ref={containerRef}>
      <div onClick={handleClick}>{children}</div>
      {visible && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-2 inline-block bg-white border border-gray-300 rounded shadow-md z-50 w-48">
          <div className="mb-2">{title}</div>
          <div className="text-right">
            <button
              onClick={handleCancel}
              className="mr-2 px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {okText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
