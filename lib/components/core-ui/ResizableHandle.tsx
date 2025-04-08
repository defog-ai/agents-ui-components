import React, { useCallback, useState, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { GripVertical } from 'lucide-react';

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
      // Add a class to the body to change cursor during dragging
      document.body.classList.add('resize-sidebar');
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-sidebar');
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-sidebar');
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={twMerge(
        'w-3 cursor-col-resize absolute right-0 top-0 h-full z-30 group flex items-center justify-center',
        isDragging ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-blue-50 dark:hover:bg-blue-900/50',
        className
      )}
      onMouseDown={handleMouseDown}
      title="Drag to resize"
    >
      {/* Visible handle bar */}
      <div className={twMerge(
        'w-0.5 h-full mx-auto bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-300 dark:group-hover:bg-blue-700',
        isDragging ? 'bg-blue-400 dark:bg-blue-600' : ''
      )} />
      
      {/* Center grip icon for better visibility */}
      <div className={twMerge(
        'absolute top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 transition-opacity',
        isDragging ? 'opacity-100' : ''
      )}>
        <GripVertical size={16} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
      </div>
    </div>
  );
};

export default ResizableHandle;