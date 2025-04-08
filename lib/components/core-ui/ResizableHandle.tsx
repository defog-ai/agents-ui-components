import React, { useCallback, useState, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface ResizableHandleProps {
  onResize: (newWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  onResize,
  minWidth = 200,
  maxWidth = 500,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new width based on mouse position
    const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
    onResize(newWidth);
  }, [isDragging, minWidth, maxWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={twMerge(
        'w-1 cursor-col-resize absolute right-0 top-0 h-full hover:bg-blue-300 dark:hover:bg-blue-700 z-30 active:bg-blue-400 dark:active:bg-blue-600 transition-colors',
        isDragging ? 'bg-blue-400 dark:bg-blue-600' : 'bg-transparent',
        className
      )}
      onMouseDown={handleMouseDown}
    />
  );
};

export default ResizableHandle;