import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
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
const DAMPING_FACTOR = 0.3;
const ITEM_MARGIN = 10;
const SCREEN_PADDING = 20;

const RadialMenu: React.FC<RadialMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();
  const centerButtonRef = useRef<HTMLButtonElement>(null);

  const { position, motionX, motionY } = useDraggable({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - CENTER_BUTTON_SIZE / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - CENTER_BUTTON_SIZE / 2 : 0,
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

  // Track window size to trigger re-layout on resize
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refs to hold the latest position and orbitalItems for the layout calculation callback
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const orbitalItemsRef = useRef(orbitalItems);
  useEffect(() => {
    orbitalItemsRef.current = orbitalItems;
  }, [orbitalItems]);


  const updateItemPositions = useCallback(() => {
    // Use current values from refs
    const currentPosition = positionRef.current;
    const currentOrbitalItems = orbitalItemsRef.current;
    // `items` prop is stable within this callback's scope unless RadialMenu re-renders with new items prop
    // `windowSize` is from state and included in useCallback deps

    let newItems = [...currentOrbitalItems];

    for (let iter = 0; iter < RELAXATION_ITERATIONS; iter++) {
      const nextPositions: { id: string; dx: number; dy: number }[] = [];

      for (let i = 0; i < newItems.length; i++) {
        const itemA = newItems[i];
        let totalForce: Vector = { x: 0, y: 0 };

        const mainButtonCenterX = currentPosition.x + CENTER_BUTTON_SIZE / 2;
        const mainButtonCenterY = currentPosition.y + CENTER_BUTTON_SIZE / 2;

        const itemAbsoluteX = mainButtonCenterX + itemA.x;
        const itemAbsoluteY = mainButtonCenterY + itemA.y;
        
        // calculateEdgeForce reads window.innerWidth/Height directly, 
        // windowSize state change triggers this function via useEffect.
        const edgeForce = calculateEdgeForce(
          itemAbsoluteX,
          itemAbsoluteY,
          itemA.size / 2,
          SCREEN_PADDING
        );
        totalForce = addVectors(totalForce, edgeForce);
        
        for (let j = 0; j < newItems.length; j++) {
          if (i === j) continue;
          const itemB = newItems[j];
          const repulsion = calculateRepulsionForce(
            { x: itemA.x, y: itemA.y, radius: itemA.size / 2 + ITEM_MARGIN / 2 },
            { x: itemB.x, y: itemB.y, radius: itemB.size / 2 + ITEM_MARGIN / 2 }
          );
          totalForce = addVectors(totalForce, repulsion);
        }

        const centerRepulsion = calculateRepulsionForce(
          { x: itemA.x, y: itemA.y, radius: itemA.size / 2 + ITEM_MARGIN / 2 },
          { x: 0, y: 0, radius: CENTER_BUTTON_SIZE / 2 + ITEM_MARGIN / 2 } // Center button is at (0,0) in relative space
        );
        totalForce = addVectors(totalForce, centerRepulsion);

        const idealX = Math.cos(itemA.baseAngle) * ORBIT_RADIUS_REFERENCE;
        const idealY = Math.sin(itemA.baseAngle) * ORBIT_RADIUS_REFERENCE;
        const attraction = calculateAttractionForce(
          { x: itemA.x, y: itemA.y }, // Current relative position
          { x: idealX, y: idealY },   // Target relative position
          0.05
        );
        totalForce = addVectors(totalForce, attraction);
        
        totalForce = limitMagnitude(totalForce, itemA.size / 2);

        nextPositions.push({ id: itemA.id, dx: totalForce.x, dy: totalForce.y });
      }

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
            targetX: newX,
            targetY: newY,
            currentRadius: Math.max(0, Math.min(newRadius, ORBIT_RADIUS_REFERENCE * 2)),
            currentAngle: newAngle,
          };
        }
        return item;
      });
    }
    setOrbitalItems(newItems);
  }, [items, setOrbitalItems, windowSize]); // Depends on `items` prop and `windowSize` state. Stable across drags.

  useEffect(() => {
    setOrbitalItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        scale: item.id === hoveredItemId ? ITEM_HOVER_SCALE : 1,
        size: item.id === hoveredItemId ? ITEM_BASE_SIZE * ITEM_HOVER_SCALE : ITEM_BASE_SIZE,
      }))
    );
  }, [hoveredItemId, setOrbitalItems]);

  // This useEffect calls the layout calculation logic.
  // It runs when factors that require a re-layout change.
  // Crucially, it does NOT run just because the main button is dragged.
  useEffect(() => {
    if (isOpen) {
      updateItemPositions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hoveredItemId, items.length, windowSize, updateItemPositions]);
  // `updateItemPositions` is now stable across drags, so this effect won't run during drag.

  useEffect(() => {
    if (isOpen) {
      controls.start(i => ({
        opacity: 1,
        scale: orbitalItems[i].scale,
        x: orbitalItems[i].targetX, // Relative X offset
        y: orbitalItems[i].targetY, // Relative Y offset
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
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleItemHoverStart = (itemId: string) => {
    setHoveredItemId(itemId);
  };

  const handleItemHoverEnd = () => {
    setHoveredItemId(null);
  };
  
  const onItemMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); 
  };

  return (
    <>
      <motion.button
        ref={centerButtonRef}
        className="radial-menu-center-button"
        style={{
          x: motionX, 
          y: motionY,
          width: CENTER_BUTTON_SIZE,
          height: CENTER_BUTTON_SIZE,
        }}
        onClick={toggleMenu}
        whileTap={{ scale: 0.95 }}
        drag
        dragConstraints={ typeof window !== 'undefined' ? { 
            left: SCREEN_PADDING, 
            right: window.innerWidth - CENTER_BUTTON_SIZE - SCREEN_PADDING, 
            top: SCREEN_PADDING, 
            bottom: window.innerHeight - CENTER_BUTTON_SIZE - SCREEN_PADDING 
        } : false }
        dragMomentum={false} 
      >
        {isOpen ? <X size={32} /> : <Menu size={32} />}
      </motion.button>

      {items.map((itemData, index) => {
        const currentItemState = orbitalItems[index];
        if (!currentItemState) return null;

        return (
          <OrbitalItem
            key={itemData.id}
            custom={index}
            animate={controls}
            item={currentItemState}
            centerPosition={{ // Absolute center of the main button
              x: position.x + CENTER_BUTTON_SIZE / 2,
              y: position.y + CENTER_BUTTON_SIZE / 2,
            }}
            onHoverStart={() => handleItemHoverStart(itemData.id)}
            onHoverEnd={handleItemHoverEnd}
            onMouseDown={onItemMouseDown}
            onClick={() => console.log(`${itemData.label} clicked`)}
          />
        );
      })}
    </>
  );
};

export default RadialMenu;
