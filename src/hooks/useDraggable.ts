import { useState, useEffect, useCallback } from 'react';
import { useMotionValue } from 'framer-motion'; // Removed MotionValue named import

interface Position {
  x: number;
  y: number;
}

export const useDraggable = (
  initialPosition: Position = { x: 0, y: 0 }
) => {
  // This state reflects the current position and is updated by motion value changes.
  // It's the "reactive" position for the rest of the application.
  const [position, setPosition] = useState<Position>(initialPosition);

  // Motion values for Framer Motion to directly control via drag.
  // TypeScript infers their types (MotionValue<number>) from useMotionValue.
  const motionX = useMotionValue(initialPosition.x);
  const motionY = useMotionValue(initialPosition.y);

  // Update internal React state when motion values change (e.g., due to drag)
  useEffect(() => {
    const unsubscribeX = motionX.onChange(latestX => {
      setPosition(prev => ({ ...prev, x: latestX }));
    });
    const unsubscribeY = motionY.onChange(latestY => {
      setPosition(prev => ({ ...prev, y: latestY }));
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [motionX, motionY]);

  // Function to programmatically update position.
  // This will update both React state and motion values.
  const updatePosition = useCallback((newPos: Position | ((prev: Position) => Position)) => {
    const resolvedPosition = typeof newPos === 'function' ? newPos(position) : newPos;
    motionX.set(resolvedPosition.x);
    motionY.set(resolvedPosition.y);
    // setPosition will be called by the onChange listeners of motionX/motionY
  }, [motionX, motionY, position]);

  // If initialPosition prop changes, reflect it.
  // This ensures that if the component using the hook re-renders with a new initialPosition,
  // the draggable element updates accordingly.
  useEffect(() => {
    motionX.set(initialPosition.x);
    motionY.set(initialPosition.y);
    // setPosition will be updated via the onChange listeners
  }, [initialPosition.x, initialPosition.y, motionX, motionY]);


  return {
    position,      // The reactive {x, y} state for use in your app logic
    motionX,       // MotionValue for the style.x of the draggable component
    motionY,       // MotionValue for the style.y of the draggable component
    setPosition: updatePosition, // Function to programmatically set the position
  };
};
