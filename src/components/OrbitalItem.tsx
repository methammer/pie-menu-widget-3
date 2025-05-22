import React from 'react';
import { motion, AnimationControls } from 'framer-motion';

interface ItemState {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  x: number; // Relative X (from animate prop, originally item.targetX)
  y: number; // Relative Y (from animate prop, originally item.targetY)
  targetX: number;
  targetY: number;
  scale: number;
  size: number;
}

interface OrbitalItemProps {
  item: ItemState;
  centerPosition: { x: number; y: number }; // Absolute center of the main button
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
      animate={animate} // Applies item.targetX as x, item.targetY as y
      initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
      className="orbital-item-button"
      style={{
        backgroundColor: item.color,
        // Base position: top-left of item is set so its center aligns with centerPosition
        // if animated x,y were 0.
        left: centerPosition.x - item.size / 2,
        top: centerPosition.y - item.size / 2,
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
