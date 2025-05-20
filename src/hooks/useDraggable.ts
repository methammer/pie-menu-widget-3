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
  ref: RefObject<HTMLElement>, // ref is not strictly used by framer-motion's pan, but kept for potential future use
  initialPosition: Position = { x: 0, y: 0 },
  options?: DraggableOptions
) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false); // This state is set but not read by RadialMenu.tsx. Kept for now.

  // 'offset' state and its setter 'setOffset' have been removed as they were unused.

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
    // This function is not currently used by RadialMenu.tsx when framer-motion's drag is active.
    // Kept for potential manual drag initiation scenarios.
    if (ref.current) {
      setIsDragging(true);
      // Original offset calculation removed as 'offset' state is removed.
      // const rect = ref.current.getBoundingClientRect();
      // setOffset({
      //   x: event.clientX - rect.left,
      //   y: event.clientY - rect.top,
      // });
      options?.onDragStart?.();
      event.preventDefault();
    }
  }, [ref, options, setIsDragging]);

  const handleDrag = useCallback((info: PanInfo) => {
    setPosition(prevPos => ({
        x: prevPos.x + info.delta.x,
        y: prevPos.y + info.delta.y
    }));
  }, [setPosition]);


  const handleDragEndMotion = useCallback(() => {
    options?.onDragEnd?.(position);
    setIsDragging(false); // Set isDragging to false on drag end
  }, [options, position, setIsDragging]);


  return {
    position,
    setPosition, // Exporting setPosition in case direct manipulation is needed
    isDragging,    // Exported, though not currently used by RadialMenu
    handleMouseDown, // Exported, though not currently used by RadialMenu with framer-motion
    handleDrag,      
    handleDragEnd: handleDragEndMotion, 
  };
};
