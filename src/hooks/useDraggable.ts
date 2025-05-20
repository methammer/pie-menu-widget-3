import { useState, RefObject, useCallback } from 'react';
import { PanInfo } from 'framer-motion';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  onDragStart?: () => void;
  onDragEnd?: (finalPosition: Position) => void;
}

export const useDraggable = (
  ref: RefObject<HTMLElement>,
  initialPosition: Position = { x: 0, y: 0 },
  options?: DraggableOptions
) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (ref.current) {
      setIsDragging(true);
      const rect = ref.current.getBoundingClientRect();
      setOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      options?.onDragStart?.();
      event.preventDefault();
    }
  }, [ref, options, setIsDragging, setOffset]); // Added setIsDragging, setOffset to deps

  // handleMouseMove and handleMouseUp removed as they were unused with framer-motion's drag prop
  // and the useEffect that used them was commented out.

  const handleDrag = useCallback((info: PanInfo) => {
    setPosition(prevPos => ({
        x: prevPos.x + info.delta.x,
        y: prevPos.y + info.delta.y
    }));
  }, [setPosition]); // Added setPosition to deps


  const handleDragEndMotion = useCallback(() => {
    options?.onDragEnd?.(position);
  }, [options, position]);


  // Effect for global mouse listeners (if not using framer-motion's drag)
  // useEffect(() => {
  //   if (isDragging) {
  //     document.addEventListener('mousemove', handleMouseMove);
  //     document.addEventListener('mouseup', handleMouseUp);
  //   } else {
  //     document.removeEventListener('mousemove', handleMouseMove);
  //     document.removeEventListener('mouseup', handleMouseUp);
  //   }
  //   return () => {
  //     document.removeEventListener('mousemove', handleMouseMove);
  //     document.removeEventListener('mouseup', handleMouseUp);
  //   };
  // }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    setPosition,
    isDragging, // Kept in case it's intended for other uses, though RadialMenu doesn't use it
    handleMouseDown, // Kept for potential manual drag initiation
    handleDrag,      
    handleDragEnd: handleDragEndMotion, 
  };
};
