import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Menu as MenuIcon, X as XIcon, LucideProps } from 'lucide-react';

// Interfaces
interface MenuItem {
  id: string;
  icon: React.FC<LucideProps>;
  label: string;
  description?: string;
  action?: () => void;
}

interface DraggableRadialMenuProps {
  items: MenuItem[];
  orbitRadius?: number;
  itemSize?: number;
  mainButtonSize?: number;
  itemIconSize?: number;
  mainIconSize?: number;
  dragThreshold?: number;
  hoverScale?: number;
  hoveredItemRadialPush?: number; // New prop for individual item push
}

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  constrainElementSize?: number;
  dragThreshold?: number;
}

// --- useDraggable Hook ---
const DEFAULT_DRAG_THRESHOLD = 5;

function useDraggable(
  ref: React.RefObject<HTMLDivElement>,
  options?: UseDraggableOptions
) {
  const getInitialPosition = useCallback(() => {
    const elSize = options?.constrainElementSize ?? ref.current?.offsetWidth ?? 50;
    const initialX = options?.initialPosition?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
    const initialY = options?.initialPosition?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
    return { x: initialX - elSize / 2, y: initialY - elSize / 2 };
  }, [options?.initialPosition, options?.constrainElementSize, ref]);

  const [position, setPosition] = useState<Position>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMovedBeyondThreshold, setHasMovedBeyondThreshold] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [interactionStartCoords, setInteractionStartCoords] = useState<Position | null>(null);

  const isDraggingRef = useRef(isDragging);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  const getEventCoordinates = (event: MouseEvent | TouchEvent): Position => {
    if ('touches' in event) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
  };
  
  const handleInteractionStart = useCallback((event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (ref.current) {
      if ('button' in event && event.button !== 0) return; 
      if (event.type === 'touchstart') event.preventDefault();
      const coords = getEventCoordinates(event.nativeEvent as MouseEvent | TouchEvent);
      setDragStartOffset({
        x: coords.x - ref.current.getBoundingClientRect().left,
        y: coords.y - ref.current.getBoundingClientRect().top,
      });
      setInteractionStartCoords(coords);
      setHasMovedBeyondThreshold(false); 
      setIsDragging(true);
    }
  }, [ref]);

  useEffect(() => {
    const handleInteractionMove = (event: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !ref.current) return;
      if (event.type === 'touchmove') event.preventDefault(); 
      const coords = getEventCoordinates(event);
      
      if (interactionStartCoords && !hasMovedBeyondThreshold) {
        const dx = coords.x - interactionStartCoords.x;
        const dy = coords.y - interactionStartCoords.y;
        if (Math.sqrt(dx * dx + dy * dy) > (options?.dragThreshold ?? DEFAULT_DRAG_THRESHOLD)) {
          setHasMovedBeyondThreshold(true);
        }
      }

      let newX = coords.x - dragStartOffset.x;
      let newY = coords.y - dragStartOffset.y;
      const currentConstrainSize = options?.constrainElementSize ?? ref.current.offsetWidth;
      newX = Math.max(0, Math.min(newX, window.innerWidth - currentConstrainSize));
      newY = Math.max(0, Math.min(newY, window.innerHeight - currentConstrainSize));
      setPosition({ x: newX, y: newY });
    };

    const handleInteractionEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleInteractionMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleInteractionMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('touchend', handleInteractionEnd);
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('touchend', handleInteractionEnd);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStartOffset, ref, options?.constrainElementSize, options?.dragThreshold, interactionStartCoords, hasMovedBeyondThreshold]);

  useEffect(() => {
    const handleResize = () => {
      if (ref.current) {
        const currentConstrainSize = options?.constrainElementSize ?? ref.current.offsetWidth;
        setPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, window.innerWidth - currentConstrainSize)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - currentConstrainSize)),
        }));
      }
    };
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', handleResize);
        handleResize(); 
    }
    return () => {
        if (typeof window !== 'undefined') window.removeEventListener('resize', handleResize);
    };
  }, [ref, options?.constrainElementSize, getInitialPosition]);
  
  return { position, handleInteractionStart, isDragging, hasMovedBeyondThreshold };
}

// --- useRadialMenuPositions Hook ---
interface MenuItemPosition {
  x: number;
  y: number;
  angle: number;
}

interface SafeArc {
  start: number;
  end: number;
  length: number;
}

interface UseRadialMenuPositionsProps {
  isOpen: boolean;
  centerPosition: Position;
  items: MenuItem[];
  initialOrbitRadius: number; 
  itemSize: number;
  mainButtonSize: number;
  hoveredItemId: string | null;
  hoverScale: number;
}

const ANGLE_EPSILON = 1e-5;
const MAX_ITERATIONS_FOR_RADIUS_ADJUSTMENT = 100;
const ORBIT_RADIUS_INCREMENT_PIXELS = 5; 
const MAX_ORBIT_RADIUS_FACTOR = 3; 

function useRadialMenuPositions({
  isOpen,
  centerPosition,
  items,
  initialOrbitRadius,
  itemSize,
  mainButtonSize,
  hoveredItemId,
  hoverScale,
}: UseRadialMenuPositionsProps) {
  const numItems = items.length;

  const [itemPositions, setItemPositions] = useState<MenuItemPosition[]>([]);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return () => {};
  }, []);

  useEffect(() => {
    if (!isOpen || numItems === 0 || typeof window === 'undefined' || initialOrbitRadius <= 0) {
      setItemPositions([]);
      return;
    }

    let currentOrbitRadius = initialOrbitRadius;
    const maxOrbitRadius = initialOrbitRadius * MAX_ORBIT_RADIUS_FACTOR;
    let calculatedPositions: MenuItemPosition[] = [];
    let iterationCount = 0;

    const mainButtonCenterX = centerPosition.x + mainButtonSize / 2;
    const mainButtonCenterY = centerPosition.y + mainButtonSize / 2;
    
    const itemRadiusForSafeAngle = (itemSize * hoverScale) / 2;


    while (iterationCount < MAX_ITERATIONS_FOR_RADIUS_ADJUSTMENT) {
      iterationCount++;
      calculatedPositions = []; 

      const isSafeAngle = (angle: number): boolean => {
        const itemCenterX = mainButtonCenterX + currentOrbitRadius * Math.cos(angle);
        const itemCenterY = mainButtonCenterY + currentOrbitRadius * Math.sin(angle);
        return (
          itemCenterX - itemRadiusForSafeAngle >= 0 &&
          itemCenterX + itemRadiusForSafeAngle <= viewportSize.width &&
          itemCenterY - itemRadiusForSafeAngle >= 0 &&
          itemCenterY + itemRadiusForSafeAngle <= viewportSize.height
        );
      };

      const resolution = 360; 
      const angleStep = (2 * Math.PI) / resolution;
      const potentialAngles: { angle: number; safe: boolean }[] = Array.from({ length: resolution }, (_, i) => {
        const angle = i * angleStep;
        return { angle, safe: isSafeAngle(angle) };
      });

      const safeArcs: SafeArc[] = [];
      let currentArcStart: number | null = null;

      for (let i = 0; i <= resolution; i++) { 
        const isCurrentSafe = i < resolution ? potentialAngles[i].safe : false; 
        const currentAngle = i < resolution ? potentialAngles[i].angle : (potentialAngles[resolution-1]?.angle + angleStep || 2 * Math.PI) ;

        if (isCurrentSafe && currentArcStart === null) {
          currentArcStart = currentAngle;
        } else if (!isCurrentSafe && currentArcStart !== null) {
          if (currentAngle > currentArcStart + ANGLE_EPSILON) { 
            safeArcs.push({ start: currentArcStart, end: currentAngle, length: currentAngle - currentArcStart });
          }
          currentArcStart = null;
        }
      }
      
      if (potentialAngles.length > 0 && potentialAngles[0].safe && potentialAngles[resolution - 1].safe && safeArcs.length > 1) {
        const firstArc = safeArcs.find(arc => Math.abs(arc.start - potentialAngles[0].angle) < ANGLE_EPSILON);
        const lastArc = safeArcs.find(arc => Math.abs(arc.end - (potentialAngles[resolution-1].angle + angleStep)) < ANGLE_EPSILON);

        if (firstArc && lastArc && firstArc !== lastArc) {
            const combinedArc: SafeArc = {
                start: lastArc.start, 
                end: firstArc.end + 2 * Math.PI, 
                length: lastArc.length + firstArc.length
            };
            safeArcs.splice(safeArcs.indexOf(firstArc), 1);
            safeArcs.splice(safeArcs.indexOf(lastArc), 1);
            safeArcs.push(combinedArc);
        }
      }
      
      let totalSafeAngleLength = safeArcs.reduce((sum, arc) => sum + arc.length, 0);

      if (numItems > 0) {
        if (totalSafeAngleLength < ANGLE_EPSILON * numItems) { 
            const angleBetweenItems = (2 * Math.PI) / numItems;
            for (let i = 0; i < numItems; i++) {
                const angle = i * angleBetweenItems;
                calculatedPositions.push({
                    x: currentOrbitRadius * Math.cos(angle),
                    y: currentOrbitRadius * Math.sin(angle),
                    angle: angle,
                });
            }
        } else {
            const anglePerItemSlot = totalSafeAngleLength / numItems;
            safeArcs.sort((a, b) => a.start - b.start); 
            
            for (let i = 0; i < numItems; i++) {
                const targetCenterAngleInConcatenatedSpace = (i + 0.5) * anglePerItemSlot;
                let placedItem = false;
                let tempCumulativeAngle = 0;

                for (const arc of safeArcs) {
                    if (targetCenterAngleInConcatenatedSpace >= tempCumulativeAngle - ANGLE_EPSILON &&
                        targetCenterAngleInConcatenatedSpace < tempCumulativeAngle + arc.length + ANGLE_EPSILON) {
                        
                        const angleOffsetWithinArc = targetCenterAngleInConcatenatedSpace - tempCumulativeAngle;
                        const clampedAngleOffset = Math.max(0, Math.min(angleOffsetWithinArc, arc.length));
                        let finalAngle = arc.start + clampedAngleOffset;
                        finalAngle = finalAngle % (2 * Math.PI); 

                        calculatedPositions.push({
                            x: currentOrbitRadius * Math.cos(finalAngle),
                            y: currentOrbitRadius * Math.sin(finalAngle),
                            angle: finalAngle,
                        });
                        placedItem = true;
                        break; 
                    }
                    tempCumulativeAngle += arc.length;
                }
                 if (!placedItem) { 
                    const fallbackAngle = safeArcs.length > 0 ? (safeArcs[0].start + safeArcs[0].length / 2) % (2 * Math.PI) : (i * (2 * Math.PI / numItems));
                    calculatedPositions.push({
                        x: currentOrbitRadius * Math.cos(fallbackAngle),
                        y: currentOrbitRadius * Math.sin(fallbackAngle),
                        angle: fallbackAngle,
                    });
                }
            }
        }
      }
      
      let overlapDetected = false;
      if (calculatedPositions.length > 1 && items.length === calculatedPositions.length) {
        for (let i = 0; i < calculatedPositions.length; i++) {
          for (let j = i + 1; j < calculatedPositions.length; j++) {
            const item_i_is_hovered = items[i].id === hoveredItemId;
            const item_j_is_hovered = items[j].id === hoveredItemId;

            const size_i = item_i_is_hovered ? itemSize * hoverScale : itemSize;
            const size_j = item_j_is_hovered ? itemSize * hoverScale : itemSize;
            
            const requiredDistance = (size_i / 2) + (size_j / 2);

            const pos_i_abs_x = mainButtonCenterX + calculatedPositions[i].x;
            const pos_i_abs_y = mainButtonCenterY + calculatedPositions[i].y;
            const pos_j_abs_x = mainButtonCenterX + calculatedPositions[j].x;
            const pos_j_abs_y = mainButtonCenterY + calculatedPositions[j].y;

            const dx = pos_i_abs_x - pos_j_abs_x;
            const dy = pos_i_abs_y - pos_j_abs_y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared < (requiredDistance * requiredDistance) - ANGLE_EPSILON) { 
              overlapDetected = true;
              break;
            }
          }
          if (overlapDetected) break;
        }
      }

      if (!overlapDetected) {
        break;
      }
      if (currentOrbitRadius >= maxOrbitRadius) {
        break; 
      }
      
      currentOrbitRadius += ORBIT_RADIUS_INCREMENT_PIXELS;
      currentOrbitRadius = Math.min(currentOrbitRadius, maxOrbitRadius);
    } 
    
    setItemPositions(calculatedPositions.sort((a,b) => a.angle - b.angle));

  }, [
    isOpen, 
    centerPosition, 
    items,
    initialOrbitRadius, 
    itemSize, 
    mainButtonSize, 
    viewportSize.width, 
    viewportSize.height,
    hoveredItemId,
    hoverScale
  ]);

  return itemPositions;
}


// --- DraggableRadialMenu Component ---
const DEFAULT_ORBIT_RADIUS = 100;
const DEFAULT_ITEM_SIZE = 40;
const DEFAULT_MAIN_BUTTON_SIZE = 56;
const DEFAULT_ITEM_ICON_SIZE = 20;
const DEFAULT_MAIN_ICON_SIZE = 28;
const CLICK_TIMEOUT_DURATION = 150; 
const DEFAULT_HOVER_SCALE = 1.3;
const ITEM_DESCRIPTION_SCALE_FACTOR = 0.7; 
const HOVER_INTENT_DELAY = 75;
const HOVER_LEAVE_DELAY = 50;
// Default value for the new prop: 25% of itemSize
const DEFAULT_HOVERED_ITEM_RADIAL_PUSH_FACTOR = 0.25; 


export const DraggableRadialMenu: React.FC<DraggableRadialMenuProps> = ({
  items,
  orbitRadius = DEFAULT_ORBIT_RADIUS,
  itemSize = DEFAULT_ITEM_SIZE,
  mainButtonSize = DEFAULT_MAIN_BUTTON_SIZE,
  itemIconSize = DEFAULT_ITEM_ICON_SIZE,
  mainIconSize = DEFAULT_MAIN_ICON_SIZE,
  dragThreshold = DEFAULT_DRAG_THRESHOLD,
  hoverScale = DEFAULT_HOVER_SCALE,
  hoveredItemRadialPush, // Use the new prop
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInteractingWithButton, setIsInteractingWithButton] = useState(false);
  const [actualHoveredItemId, setActualHoveredItemId] = useState<string | null>(null);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate default for hoveredItemRadialPush if not provided
  const actualHoveredItemRadialPush = hoveredItemRadialPush ?? itemSize * DEFAULT_HOVERED_ITEM_RADIAL_PUSH_FACTOR;

  const { position, handleInteractionStart, hasMovedBeyondThreshold } = useDraggable(menuRef, {
    initialPosition: { 
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 
    },
    constrainElementSize: mainButtonSize,
    dragThreshold: dragThreshold,
  });

  const itemPositions = useRadialMenuPositions({
    isOpen,
    centerPosition: position, 
    items,
    initialOrbitRadius: orbitRadius, 
    itemSize,
    mainButtonSize,
    hoveredItemId: actualHoveredItemId,
    hoverScale,
  });

  const clearHoverStateAndTimers = useCallback(() => {
    setActualHoveredItemId(null);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const toggleMenu = useCallback(() => {
    if (!hasMovedBeyondThreshold && !isInteractingWithButton) {
      setIsOpen(prev => {
        const nextIsOpen = !prev;
        if (!nextIsOpen) {
          clearHoverStateAndTimers();
        }
        return nextIsOpen;
      });
      setIsInteractingWithButton(true);
      setTimeout(() => setIsInteractingWithButton(false), CLICK_TIMEOUT_DURATION);
    }
  }, [hasMovedBeyondThreshold, isInteractingWithButton, clearHoverStateAndTimers]);
  
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);
  
  const handleItemMouseEnter = useCallback((itemId: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setActualHoveredItemId(itemId);
      hoverTimerRef.current = null;
    }, HOVER_INTENT_DELAY);
  }, []);

  const handleItemMouseLeave = useCallback((itemId: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverTimerRef.current = setTimeout(() => {
      setActualHoveredItemId(prevHoveredId => (prevHoveredId === itemId ? null : prevHoveredId));
      hoverTimerRef.current = null;
    }, HOVER_LEAVE_DELAY);
  }, []);
  
  const MainIconComponent = isOpen ? XIcon : MenuIcon;

  const memoizedItems = useMemo(() => items.map((item, index) => {
    const pos = itemPositions[index];
    if (!pos) return null;

    const isHovered = item.id === actualHoveredItemId;
    
    const hitboxEffectiveSize = itemSize * hoverScale; 
    const visualItemBaseSize = itemSize;

    let effectivePosX = pos.x;
    let effectivePosY = pos.y;

    if (isOpen && isHovered && pos.angle != null) { // Ensure angle is available
      // Calculate the base radius from pos.x and pos.y (which is currentOrbitRadius for this item)
      // This is not strictly necessary if pos.x and pos.y are already at the correct currentOrbitRadius
      // We just need to push it further along the angle.
      const radialPush = actualHoveredItemRadialPush;
      effectivePosX += Math.cos(pos.angle) * radialPush;
      effectivePosY += Math.sin(pos.angle) * radialPush;
    }
    
    const hitboxX = mainButtonSize / 2 + effectivePosX - hitboxEffectiveSize / 2;
    const hitboxY = mainButtonSize / 2 + effectivePosY - hitboxEffectiveSize / 2;
    
    const visualItemScale = isOpen ? (isHovered ? hoverScale : 1) : 0.3;
    const showDescription = isHovered && isOpen && item.description;
    
    const currentIconSize = showDescription ? itemIconSize * ITEM_DESCRIPTION_SCALE_FACTOR : itemIconSize;
    const descriptionFontSize = itemIconSize * 0.40 * ITEM_DESCRIPTION_SCALE_FACTOR; 
    
    const paddingTopForDescription = showDescription ? `${currentIconSize * 0.15}px` : '0px';
    const descriptionMarginTop = showDescription ? `${currentIconSize * 0.1}px` : '0px';
    const itemPadding = showDescription ? '2px' : '0px';

    return (
      <div
        key={item.id}
        style={{
          position: 'absolute',
          width: hitboxEffectiveSize,
          height: hitboxEffectiveSize,
          left: `${hitboxX}px`,
          top: `${hitboxY}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isOpen ? 1 : 0,
          transitionProperty: 'opacity, left, top', // left and top transitions will animate the push
          transitionDuration: isOpen ? '0.25s' : '0.15s',
          transitionTimingFunction: 'ease-out',
          willChange: 'opacity, left, top',
          zIndex: isHovered ? 20 : 10,
        }}
        onMouseEnter={() => isOpen && handleItemMouseEnter(item.id)}
        onMouseLeave={() => isOpen && handleItemMouseLeave(item.id)}
        onClick={(e) => {
          e.stopPropagation(); 
          item.action?.();
          setIsOpen(false);
          clearHoverStateAndTimers();
        }}
      >
        <div
          style={{
            width: visualItemBaseSize,
            height: visualItemBaseSize,
            transform: `scale(${visualItemScale})`,
            transformOrigin: 'center center',
            transitionProperty: 'transform, padding',
            transitionDuration: '0.25s', 
            transitionTimingFunction: 'ease-out', 
            willChange: 'transform, padding',
            padding: itemPadding,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="rounded-full bg-sky-500 hover:bg-sky-400 text-white shadow-lg"
          title={!showDescription ? item.label : ""} 
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transitionProperty: 'padding-top',
              transitionDuration: '0.25s', 
              transitionTimingFunction: 'ease-out', 
              willChange: 'padding-top',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: showDescription ? 'flex-start' : 'center',
              textAlign: 'center',
              paddingTop: paddingTopForDescription,
              overflow: 'hidden', 
              borderRadius: 'inherit', 
            }}>
            <div style={{ flexShrink: 0 }}> 
              <item.icon size={currentIconSize} />
            </div>
            {showDescription && (
              <span style={{
                fontSize: `${descriptionFontSize}px`,
                marginTop: descriptionMarginTop,
                lineHeight: '1.1',
                userSelect: 'none',
                width: '95%', 
                textAlign: 'center',
                whiteSpace: 'normal', 
                wordBreak: 'break-word', 
                color: 'white',
                opacity: isOpen && isHovered ? 1 : 0,
                transition: 'opacity 0.2s 0.1s ease-in', 
                willChange: 'opacity',
              }}>
                {item.description}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }), [
    items, 
    itemPositions, 
    isOpen, 
    mainButtonSize, 
    itemSize, 
    itemIconSize, 
    actualHoveredItemId, 
    hoverScale, 
    handleItemMouseEnter, 
    handleItemMouseLeave, 
    clearHoverStateAndTimers,
    actualHoveredItemRadialPush // Added to dependency array
  ]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: mainButtonSize, 
        height: mainButtonSize,
        zIndex: 1000, 
        touchAction: 'none', 
      }}
    >
      <button
        type="button"
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        onClick={toggleMenu} 
        style={{
          width: mainButtonSize,
          height: mainButtonSize,
          position: 'relative', 
          zIndex: 1, 
        }}
        className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-transform duration-150 ease-in-out active:scale-95"
      >
        <MainIconComponent size={mainIconSize} className={`transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className="absolute"
        style={{ 
          top: `0px`, 
          left: `0px`,
          width: `${mainButtonSize}px`, 
          height: `${mainButtonSize}px`,
          pointerEvents: isOpen ? 'auto' : 'none' 
        }}
      >
        {memoizedItems}
      </div>
    </div>
  );
};

export default DraggableRadialMenu;
