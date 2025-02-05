import React from 'react';

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  width?: string | number;
  height?: string | number;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
  visible,
  onClose,
  placement = 'right',
  width = 256,
  height = 256,
  title,
  children,
}) => {
  return (
    <>
      {visible && <div className="fixed inset-0 bg-black opacity-40 z-40" onClick={onClose} />}
      <div className={
        `fixed bg-white z-50 transition-transform duration-300 ` +
        (placement === 'right' ? `top-0 right-0 h-full ${visible ? 'translate-x-0' : 'translate-x-full'}` :
         placement === 'left' ? `top-0 left-0 h-full ${visible ? 'translate-x-0' : '-translate-x-full'}` :
         placement === 'top' ? `top-0 left-0 w-full ${visible ? 'translate-y-0' : '-translate-y-full'}` :
         /* bottom */ `bottom-0 left-0 w-full ${visible ? 'translate-y-0' : 'translate-y-full'}`)
      } style={{
          width: (placement === 'left' || placement === 'right') ? width : '100%',
          height: (placement === 'top' || placement === 'bottom') ? height : '100%',
        }}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          {title && <div className="text-lg font-medium">{title}</div>}
          <button className="bg-transparent border-none text-2xl cursor-pointer leading-none" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  );
};

export default Drawer;
