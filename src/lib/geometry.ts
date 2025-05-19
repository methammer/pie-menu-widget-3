export interface Vector {
  x: number;
  y: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export function addVectors(v1: Vector, v2: Vector): Vector {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

export function subtractVectors(v1: Vector, v2: Vector): Vector {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function multiplyVector(v: Vector, scalar: number): Vector {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function getMagnitude(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalizeVector(v: Vector): Vector {
  const mag = getMagnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function limitMagnitude(v: Vector, maxMag: number): Vector {
  const mag = getMagnitude(v);
  if (mag > maxMag) {
    return multiplyVector(normalizeVector(v), maxMag);
  }
  return v;
}

export function calculateRepulsionForce(circleA: Circle, circleB: Circle): Vector {
  const dx = circleA.x - circleB.x;
  const dy = circleA.y - circleB.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const combinedRadius = circleA.radius + circleB.radius;

  if (distance < combinedRadius && distance > 0) {
    const overlap = combinedRadius - distance;
    const forceMagnitude = overlap * 0.5; // Adjust strength as needed
    return {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    };
  }
  return { x: 0, y: 0 };
}

export function calculateEdgeForce(
  itemX: number, // absolute X of item center
  itemY: number, // absolute Y of item center
  itemRadius: number,
  screenPadding: number
): Vector {
  let force: Vector = { x: 0, y: 0 };
  const forceStrength = 0.5; // Adjust as needed

  // Left edge
  if (itemX - itemRadius < screenPadding) {
    force.x = (screenPadding - (itemX - itemRadius)) * forceStrength;
  }
  // Right edge
  if (itemX + itemRadius > window.innerWidth - screenPadding) {
    force.x = -( (itemX + itemRadius) - (window.innerWidth - screenPadding) ) * forceStrength;
  }
  // Top edge
  if (itemY - itemRadius < screenPadding) {
    force.y = (screenPadding - (itemY - itemRadius)) * forceStrength;
  }
  // Bottom edge
  if (itemY + itemRadius > window.innerHeight - screenPadding) {
    force.y = -( (itemY + itemRadius) - (window.innerHeight - screenPadding) ) * forceStrength;
  }
  return force;
}

export function calculateAttractionForce(currentPos: Vector, targetPos: Vector, strength: number): Vector {
  const direction = subtractVectors(targetPos, currentPos);
  return multiplyVector(normalizeVector(direction), getMagnitude(direction) * strength);
}
