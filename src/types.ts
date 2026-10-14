export type ZoneId = 
  | 'street' 
  | 'security' 
  | 'reception' 
  | 'workstation' 
  | 'design' 
  | 'meeting' 
  | 'boss';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type GraphicsQuality = 'low' | 'high';

export type CameraPreset = 'isometric' | 'topdown' | 'street' | 'reception' | 'workstation' | 'boss' | 'cinematic';

export interface OfficeZone {
  id: ZoneId;
  name: string;
  subtitle: string;
  position: [number, number, number];
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];
  description: string;
  dialogue?: {
    speaker: string;
    avatar: string;
    text: string;
    options: {
      label: string;
      targetZone?: ZoneId;
      action?: string;
    }[];
  };
  features: string[];
  metrics?: { label: string; value: string }[];
}

export interface BrandingConfig {
  companyName: string;
  tagline: string;
  domain: string;
  accentColor: string;
}
