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
      // Prevent text selection during drag
      event.preventDefault();
    }
  }, [ref, options]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: event.clientX - offset.x,
        y: event.clientY - offset.y,
      });
    }
  }, [isDragging, offset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      options?.onDragEnd?.(position);
    }
  }, [isDragging, options, position]);

  // Framer Motion Pan event handlers
  const handleDrag = useCallback((info: PanInfo) => {
    // Framer Motion's PanInfo.point gives absolute screen coordinates
    // We need to adjust by the initial offset if we were manually setting style.transform
    // However, with framer-motion's `drag` prop, it handles the transform.
    // We update our `position` state to keep it in sync for other logic (like orbital items).
    // The `info.offset.x` and `info.offset.y` are deltas from the drag start.
    // `initialPosition` is the position *before* this drag session started.
    
    // This logic assumes `initialPosition` is the state *before* the current drag started.
    // If `position` is continuously updated, this needs adjustment.
    // For simplicity with framer-motion's `drag` prop, we can directly use its calculated position
    // if the element is absolutely positioned and `drag` prop is used.
    // Let's assume `initialPosition` is the position when drag started for this session.
    // This might need refinement depending on how framer-motion's `drag` interacts with external state.
    
    // A simpler way when using framer-motion's `drag` prop is to let it manage the visual position,
    // and if you need the absolute position for other logic, you might read it from the DOM
    // or ensure your `position` state is correctly updated.
    // For now, let's update `position` based on delta, assuming `position` is the current state.
    
    setPosition(prevPos => ({
        x: prevPos.x + info.delta.x,
        y: prevPos.y + info.delta.y
    }));

  }, []);


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
    setPosition, // Expose setPosition for direct manipulation if needed
    isDragging,
    handleMouseDown, // For manual drag setup
    handleDrag,      // For Framer Motion onPan
    handleDragEnd: handleDragEndMotion, // For Framer Motion onPanEnd
  };
};
