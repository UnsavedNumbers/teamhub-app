// Storage configuration constants
export const STORAGE_BUCKETS = {
  PUBLIC_MEDIA: import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET || 'public-media',
  ATHLETE_IMPORTS: import.meta.env.VITE_SUPABASE_ATHLETE_IMPORTS_BUCKET || 'athlete-imports',
} as const;

// Folder structure within buckets
export const STORAGE_FOLDERS = {
  EVENT_BANNERS: 'event-banners',
  ORG_LOGOS: 'org-logos',
  TEAM_MEDIA: 'team-media',
  USER_AVATARS: 'user-avatars',
  SPORTS: 'sports',
  TRAVEL_ITINERARIES: 'travel-itineraries',
  ATHLETE_IMPORTS: 'imports', // Subfolder within athlete-imports bucket
} as const;

// Helper functions for consistent path construction
export const getPublicMediaPath = (folder: keyof typeof STORAGE_FOLDERS, fileName: string): string => {
  return `${STORAGE_FOLDERS[folder]}/${fileName}`;
};

export const getAthleteImportPath = (fileName: string): string => {
  return `${STORAGE_FOLDERS.ATHLETE_IMPORTS}/${fileName}`;
};