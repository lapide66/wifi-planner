
export type Frequency = '2.4GHz' | '5GHz';

export interface APModel {
  id: string;
  name: string;
  power24: number; // dBm
  power5: number;  // dBm
  brand: 'TP-Link' | 'Intelbras' | 'Ubiquiti';
}

export const AP_MODELS: APModel[] = [
  { id: 'ex141', name: 'TP-Link EX141', power24: 20, power5: 23, brand: 'TP-Link' },
  { id: 'eap610', name: 'TP-Link EAP610-Outdoor', power24: 25, power5: 25, brand: 'TP-Link' },
  { id: 'ap3000', name: 'Intelbras AP 3000 AX Outdoor', power24: 23, power5: 22, brand: 'Intelbras' },
  { id: 'ap1250', name: 'Intelbras AP 1250 AC Outdoor', power24: 26, power5: 26, brand: 'Intelbras' },
  { id: 'u7o', name: 'Ubiquiti UniFi U7-Outdoor', power24: 23, power5: 26, brand: 'Ubiquiti' },
  { id: 'acpro', name: 'Ubiquiti UniFi AC Pro', power24: 22, power5: 22, brand: 'Ubiquiti' },
];

export interface Material {
  id: string;
  name: string;
  attenuation: number; // dB
  color: string;
}

export const MATERIALS: Material[] = [
  { id: 'brick', name: 'Brick (Tijolo)', attenuation: 10, color: '#A52A2A' },
  { id: 'concrete', name: 'Concrete Slab (Laje)', attenuation: 15, color: '#808080' },
  { id: 'wood', name: 'Wood Door (Porta)', attenuation: 4, color: '#DEB887' },
  { id: 'glass', name: 'Glass (Vidro)', attenuation: 2, color: '#ADD8E6' },
  { id: 'drywall', name: 'Drywall', attenuation: 3, color: '#F5F5DC' },
];

export const SCALE = 25; // 1m = 25px
export const PLAN_WIDTH_M = 14.20;
export const PLAN_HEIGHT_M = 30.05;

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  materialId: string;
  floor: 0 | 1;
}

export interface APState {
  modelId: string | null;
  x: number; // meters
  y: number; // meters
  floor: 0 | 1;
  height: number; // meters
  frequency: Frequency;
}

export interface AppState {
  walls: Wall[];
  ap: APState;
  deviceHeight: number;
  externalPenalty: number;
}
