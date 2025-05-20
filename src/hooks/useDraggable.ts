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
  // const [offset, setOffset] = useState<Position>({ x: 0, y: 0 }); // Removed unused 'offset' state

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (ref.current) {
      setIsDragging(true);
      // const rect = ref.current.getBoundingClientRect(); // 'rect' was part of 'offset' calculation
      // setOffset({ // 'offset' state removed
      //   x: event.clientX - rect.left,
      //   y: event.clientY - rect.top,
      // });
      options?.onDragStart?.();
      event.preventDefault();
    }
  }, [ref, options, setIsDragging]); // Removed setOffset from deps

  const handleDrag = useCallback((info: PanInfo) => {
    setPosition(prevPos => ({
        x: prevPos.x + info.delta.x,
        y: prevPos.y + info.delta.y
    }));
  }, [setPosition]);


  const handleDragEndMotion = useCallback(() => {
    options?.onDragEnd?.(position);
    setIsDragging(false); // Also set isDragging to false on drag end
  }, [options, position, setIsDragging]); // Added setIsDragging to deps


  return {
    position,
    setPosition,
    isDragging,
    handleMouseDown,
    handleDrag,      
    handleDragEnd: handleDragEndMotion, 
  };
};
