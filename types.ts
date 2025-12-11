export enum SeamlessMethod {
  MIRRORED = 'mirrored',
  SCATTERED = 'scattered',
  PATCH_BASED = 'patch_based'
}

export enum TileFormat {
  ONE = 1,
  TWO = 2,
  THREE = 3
}

export enum OutputFormat {
  JPEG = 'image/jpeg',
  PNG = 'image/png'
}

export interface CropSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface AveragingSettings {
  intensity: number; // 0-100
  radius: number; // 1-20
}

export interface ProcessResult {
  seamlessUrl: string;
  previewUrl: string;
  width: number;
  height: number;
}