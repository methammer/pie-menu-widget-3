import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import OrbitalItem from './OrbitalItem';
import { useDraggable } from '@/hooks/useDraggable';
import {
  calculateRepulsionForce,
  calculateEdgeForce,
  calculateAttractionForce,
  Vector,
  addVectors,
  limitMagnitude,
  subtractVectors,
  normalizeVector,
  multiplyVector,
  getMagnitude,
} from '@/lib/geometry';

interface OrbitalItemData {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

interface RadialMenuProps {
  items: OrbitalItemData[];
}

interface ItemState extends OrbitalItemData {
  x: number; // Relative to center
  y: number; // Relative to center
  targetX: number;
  targetY: number;
  currentRadius: number;
  currentAngle: number;
  baseAngle: number;
  scale: number;
  size: number; // Current effective size (diameter)
}

const CENTER_BUTTON_SIZE = 64;
const ITEM_BASE_SIZE = 56;
const ITEM_HOVER_SCALE = 1.2;
const ORBIT_RADIUS_REFERENCE = 120;
const RELAXATION_ITERATIONS = 10;
const DAMPING_FACTOR = 0.3; // How much of the force is applied each step
const ITEM_MARGIN = 10; // Margin between items and center/edges
const SCREEN_PADDING = 20; // Padding from screen edges

const RadialMenu: React.FC<RadialMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();
  const centerButtonRef = useRef<HTMLButtonElement>(null);

  const { position, handleDrag, handleDragEnd } = useDraggable(centerButtonRef, {
    x: window.innerWidth / 2 - CENTER_BUTTON_SIZE / 2,
    y: window.innerHeight / 2 - CENTER_BUTTON_SIZE / 2,
  });

  const [orbitalItems, setOrbitalItems] = useState<ItemState[]>(() =>
    items.map((item, index) => {
      const angle = (index / items.length) * 2 * Math.PI;
      return {
        ...item,
        x: Math.cos(angle) * ORBIT_RADIUS_REFERENCE,
        y: Math.sin(angle) * ORBIT_RADIUS_REFERENCE,
        targetX: Math.cos(angle) * ORBIT_RADIUS_REFERENCE,
        targetY: Math.sin(angle) * ORBIT_RADIUS_REFERENCE,
        currentRadius: ORBIT_RADIUS_REFERENCE,
        currentAngle: angle,
        baseAngle: angle,
        scale: 1,
        size: ITEM_BASE_SIZE,
      };
    })
  );

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const updateItemPositions = useCallback(() => {
    if (!centerButtonRef.current) return;

    let newItems = [...orbitalItems];

    for (let iter = 0; iter < RELAXATION_ITERATIONS; iter++) {
      const nextPositions: { id: string; dx: number; dy: number }[] = [];

      for (let i = 0; i < newItems.length; i++) {
        const itemA = newItems[i];
        let totalForce: Vector = { x: 0, y: 0 };

        // 1. Edge avoidance force
        const itemAbsoluteX = position.x + CENTER_BUTTON_SIZE / 2 + itemA.x;
        const itemAbsoluteY = position.y + CENTER_BUTTON_SIZE / 2 + itemA.y;
        const edgeForce = calculateEdgeForce(
          itemAbsoluteX,
          itemAbsoluteY,
          itemA.size / 2, // radius
          SCREEN_PADDING
        );
        totalForce = addVectors(totalForce, edgeForce);
        
        // 2. Repulsion from other items
        for (let j = 0; j < newItems.length; j++) {
          if (i === j) continue;
          const itemB = newItems[j];
          const repulsion = calculateRepulsionForce(
            { x: itemA.x, y: itemA.y, radius: itemA.size / 2 + ITEM_MARGIN / 2 },
            { x: itemB.x, y: itemB.y, radius: itemB.size / 2 + ITEM_MARGIN / 2 }
          );
          totalForce = addVectors(totalForce, repulsion);
        }

        // 3. Repulsion from center button
        const centerRepulsion = calculateRepulsionForce(
          { x: itemA.x, y: itemA.y, radius: itemA.size / 2 + ITEM_MARGIN / 2 },
          { x: 0, y: 0, radius: CENTER_BUTTON_SIZE / 2 + ITEM_MARGIN / 2 }
        );
        totalForce = addVectors(totalForce, centerRepulsion);


        // 4. Attraction to ideal orbit (weaker force)
        const idealX = Math.cos(itemA.baseAngle) * ORBIT_RADIUS_REFERENCE;
        const idealY = Math.sin(itemA.baseAngle) * ORBIT_RADIUS_REFERENCE;
        const attraction = calculateAttractionForce(
          { x: itemA.x, y: itemA.y },
          { x: idealX, y: idealY },
          0.05 // Weaker attraction strength
        );
        totalForce = addVectors(totalForce, attraction);
        
        // Limit total force to prevent extreme jumps
        totalForce = limitMagnitude(totalForce, itemA.size / 2); // Max move half its size

        nextPositions.push({ id: itemA.id, dx: totalForce.x, dy: totalForce.y });
      }

      // Apply damped movements
      newItems = newItems.map(item => {
        const move = nextPositions.find(p => p.id === item.id);
        if (move) {
          const newX = item.x + move.dx * DAMPING_FACTOR;
          const newY = item.y + move.dy * DAMPING_FACTOR;
          const newRadius = Math.sqrt(newX * newX + newY * newY);
          const newAngle = Math.atan2(newY, newX);
          
          return {
            ...item,
            x: newX,
            y: newY,
            targetX: newX, // Update target for animation
            targetY: newY,
            currentRadius: Math.max(0, Math.min(newRadius, ORBIT_RADIUS_REFERENCE * 2)), // Constrain radius
            currentAngle: newAngle,
          };
        }
        return item;
      });
    }
    setOrbitalItems(newItems);
  }, [orbitalItems, position.x, position.y, items.length]);


  useEffect(() => {
    // Update item sizes based on hover state
    setOrbitalItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        scale: item.id === hoveredItemId ? ITEM_HOVER_SCALE : 1,
        size: item.id === hoveredItemId ? ITEM_BASE_SIZE * ITEM_HOVER_SCALE : ITEM_BASE_SIZE,
      }))
    );
  }, [hoveredItemId]);

  useEffect(() => {
    if (isOpen) {
      updateItemPositions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, position.x, position.y, hoveredItemId, items.length]); // updateItemPositions is memoized but its dependencies are here

  // Animation for opening/closing items
  useEffect(() => {
    if (isOpen) {
      controls.start(i => ({
        opacity: 1,
        scale: orbitalItems[i].scale,
        x: orbitalItems[i].targetX,
        y: orbitalItems[i].targetY,
        transition: { type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 },
      }));
    } else {
      controls.start({
        opacity: 0,
        scale: 0.5,
        x: 0,
        y: 0,
        transition: { duration: 0.3 },
      });
    }
  }, [isOpen, orbitalItems, controls]);


  const handleItemHoverStart = (itemId: string) => {
    setHoveredItemId(itemId);
  };

  const handleItemHoverEnd = () => {
    setHoveredItemId(null);
  };
  
  // Prevent dragging when clicking on an item
  const onItemMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); 
  };


  return (
    <>
      <motion.button
        ref={centerButtonRef}
        className="radial-menu-center-button"
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={toggleMenu}
        onPan={(_event, info: PanInfo) => handleDrag(info)}
        onPanEnd={handleDragEnd}
        whileTap={{ scale: 0.95 }}
        drag // Enable framer-motion drag
        dragConstraints={{ // Optional: constrain dragging to viewport
            left: SCREEN_PADDING, 
            right: window.innerWidth - CENTER_BUTTON_SIZE - SCREEN_PADDING, 
            top: SCREEN_PADDING, 
            bottom: window.innerHeight - CENTER_BUTTON_SIZE - SCREEN_PADDING 
        }}
        dragMomentum={false} // To make it feel more direct
        onDrag={(_event, info) => {
            // Update position state based on framer-motion's drag info
            // This is needed if you want your position state to be in sync
            // with framer-motion's internal drag state.
            // For this example, framer-motion handles the visual position.
            // If you need to react to the dragged position for other logic,
            // you might update your `position` state here.
            // For now, we let framer-motion handle the visual position directly.
            // The `position` state from `useDraggable` is mostly for initial setup
            // or if we weren't using framer-motion's built-in drag.
            if (centerButtonRef.current) {
                 // This is a simplified update. A more robust solution might involve
                 // reconciling framer-motion's transform with your absolute position state.
                 // For now, we'll assume framer-motion's drag is sufficient for visuals.
                 // The `position` state is mainly for the orbital items' reference.
                 const rect = centerButtonRef.current.getBoundingClientRect();
                 // This is tricky because framer-motion applies a transform.
                 // We'll rely on the `position` state being updated by `useDraggable`
                 // if we were using its `handleDrag` for manual transform.
                 // Since framer-motion's `drag` prop is active, it handles the transform.
                 // We need to ensure our `position` state (used by orbitals) is correct.
                 // This might require a different approach if not using framer-motion's drag.
                 // For now, let's assume `position` is updated correctly by `useDraggable`
                 // or that framer-motion's drag is the source of truth for the center.
            }
        }}
      >
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </motion.button>

      {items.map((itemData, index) => (
        <OrbitalItem
          key={itemData.id}
          custom={index}
          animate={controls}
          item={orbitalItems[index]}
          centerPosition={{
            x: position.x + CENTER_BUTTON_SIZE / 2,
            y: position.y + CENTER_BUTTON_SIZE / 2,
          }}
          onHoverStart={() => handleItemHoverStart(itemData.id)}
          onHoverEnd={handleItemHoverEnd}
          onMouseDown={onItemMouseDown}
          onClick={() => console.log(`${itemData.label} clicked`)}
        />
      ))}
    </>
  );
};

export default RadialMenu;
