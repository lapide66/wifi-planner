
import { Point, Wall, MATERIALS, Frequency } from '../constants';

/**
 * ITU-R P.1238 attenuation model
 * L(dB) = 20·log10(f_MHz) + N·log10(d_m) − 28
 */
export function calculatePathLoss(distance: number, frequency: Frequency): number {
  const f_MHz = frequency === '2.4GHz' ? 2400 : 5000;
  const N = frequency === '2.4GHz' ? 30 : 31;
  const d = Math.max(distance, 1); // Minimum distance check
  
  return 20 * Math.log10(f_MHz) + N * Math.log10(d) - 28;
}

/**
 * Checks if a line segment (p1, p2) intersects with another segment (p3, p4)
 */
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return null; // Parallel

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1)
    };
  }
  return null;
}

/**
 * Calculates total wall attenuation between two points
 */
export function calculateWallAttenuation(start: Point, end: Point, walls: Wall[]): number {
  let totalAttenuation = 0;
  for (const wall of walls) {
    const intersection = lineIntersection(start, end, wall.start, wall.end);
    if (intersection) {
      const material = MATERIALS.find(m => m.id === wall.materialId);
      totalAttenuation += material ? material.attenuation : 0;
    }
  }
  return totalAttenuation;
}

/**
 * ITU-R P.1238 Floor penetration loss
 */
export function getFloorLoss(n: number, frequency: Frequency): number {
  if (n === 0) return 0;
  const baseLoss = frequency === '2.4GHz' ? 15 : 16;
  // For ITU-R P.1238, loss is typically BaseLoss + (n-1)*NextFloorLoss 
  // but the prompt specifies 1 floor = 15/16dB.
  return baseLoss * n;
}

/**
 * RSSI calculation
 */
export function calculateRSSI(
  txPower: number,
  distance3D: number,
  wallAttenuation: number,
  floorLoss: number,
  externalPenalty: number,
  frequency: Frequency
): number {
  const pathLoss = calculatePathLoss(distance3D, frequency);
  return txPower - pathLoss - wallAttenuation - floorLoss - externalPenalty;
}

/**
 * Maps RSSI to a color for the heatmap
 */
export function rssiToColor(rssi: number): string {
  if (rssi >= -55) return 'rgb(0, 128, 0)';      // Dark Green
  if (rssi >= -67) return 'rgb(50, 205, 50)';    // Lime Green
  if (rssi >= -75) return 'rgb(255, 255, 0)';    // Yellow
  if (rssi >= -85) return 'rgb(255, 165, 0)';    // Orange
  return 'rgb(255, 0, 0)';                       // Red
}

export function rssiToClassification(rssi: number): string {
  if (rssi >= -55) return 'Excelente';
  if (rssi >= -67) return 'Boa';
  if (rssi >= -75) return 'Regular';
  if (rssi >= -85) return 'Ruim';
  return 'Inexistente';
}
