import React from 'react';
import { motion, AnimationControls } from 'framer-motion';

interface ItemState {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  size: number;
}

interface OrbitalItemProps {
  item: ItemState;
  centerPosition: { x: number; y: number };
  animate: AnimationControls;
  custom: number; // Index for animation delay
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const OrbitalItem: React.FC<OrbitalItemProps> = ({
  item,
  centerPosition,
  animate,
  custom,
  onHoverStart,
  onHoverEnd,
  onMouseDown,
  onClick
}) => {
  return (
    <motion.button
      custom={custom}
      animate={animate}
      initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
      className="orbital-item-button"
      style={{
        backgroundColor: item.color,
        // Position is relative to the center button, then offset by centerPosition
        // Framer Motion will handle the x and y from animate prop relative to its parent's flow,
        // but since these are absolutely positioned, we need to set left/top.
        // The x, y from item state are offsets from the center of the main button.
        left: centerPosition.x - item.size / 2, // Adjust for item size to center it
        top: centerPosition.y - item.size / 2,  // Adjust for item size to center it
        width: item.size,
        height: item.size,
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={onMouseDown} // Prevent dragging main button when clicking item
      onClick={onClick}
      whileHover={{ zIndex: 1000 }} // Bring to front on hover
    >
      {item.icon}
      {item.scale > 1 && <span className="orbital-item-label">{item.label}</span>}
    </motion.button>
  );
};

export default OrbitalItem;
