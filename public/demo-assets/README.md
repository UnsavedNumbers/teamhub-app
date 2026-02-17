# Demo Assets Directory

This directory contains locally-stored assets (images, videos, photos) used by fake data services in demo mode. All assets are stored in the `/public` folder so they can be easily replaced without touching code or updating Supabase storage.

## Directory Structure

```
public/demo-assets/
├── videos/              # Video files for Video Library feature
│   ├── championship-game-final-quarter.mp4
│   ├── championship-game-final-quarter.jpg (thumbnail)
│   ├── practice-passing-drills.mp4
│   ├── practice-passing-drills.jpg (thumbnail)
│   ├── training-core-workout.mp4
│   ├── training-core-workout.jpg (thumbnail)
│   ├── highlights-season-2024.mp4
│   ├── highlights-season-2024.jpg (thumbnail)
│   └── event-tournament-opening.mp4
│   └── event-tournament-opening.jpg (thumbnail)
│
├── photos/              # Photo files for Photo Gallery feature
│   ├── team-celebration.jpg
│   ├── team-huddle.jpg
│   ├── players-action.jpg
│   ├── soccer-action.jpg
│   ├── team-warmup.jpg
│   ├── player-portrait.jpg
│   ├── tournament-field.jpg
│   ├── tournament-trophy.jpg
│   ├── facility-exterior.jpg
│   └── equipment-room.jpg
│
└── athlete-photos/      # Profile photos for Athletes feature
    ├── emma-johnson.jpg
    ├── liam-johnson.jpg
    ├── olivia-smith.jpg
    ├── noah-smith.jpg
    ├── ava-williams.jpg
    ├── ethan-williams.jpg
    ├── sophia-chen.jpg
    ├── mason-rodriguez.jpg
    ├── isabella-rodriguez.jpg
    └── aiden-patel.jpg
```

## How It Works

When `USE_FAKE_DATA=true` is set in your environment:

1. **Video Library**: Uses videos from `/demo-assets/videos/` with local file paths
2. **Photo Gallery**: Uses photos from `/demo-assets/photos/` with local file paths  
3. **Athletes**: Uses profile photos from `/demo-assets/athlete-photos/` with local file paths

All fake data services reference these local paths, so you can replace any asset by simply swapping files in these directories.

## Replacing Assets

### To Replace a Video:

1. Add your video file to `public/demo-assets/videos/`
2. Use the exact filename referenced in `src/data/fake/mockVideos.ts`
3. Optionally add a `.jpg` thumbnail with the same base name (e.g., `my-video.mp4` → `my-video.jpg`)

### To Replace a Photo:

1. Add your photo file to `public/demo-assets/photos/`
2. Use the exact filename referenced in `src/data/fake/mockGalleries.ts`
3. Photos are referenced by filename, so keep names consistent

### To Replace an Athlete Photo:

1. Add your photo file to `public/demo-assets/athlete-photos/`
2. Use the exact filename referenced in `src/data/fake/fakeUsers.ts`
3. Format: `{first-name}-{last-name}.jpg` (lowercase, hyphenated)

## Recommended Specifications

### Videos

- **Format**: MP4 (H.264 codec recommended)
- **Resolution**: 720p (1280x720) or 1080p (1920x1080)
- **Aspect Ratio**: 16:9
- **Frame Rate**: 30fps or 60fps
- **File Size**: Keep under 50MB per video for reasonable load times
- **Thumbnails**: JPG format, 1280x720px, same base filename as video

### Photos

- **Format**: JPG (optimized for web)
- **Resolution**: 
  - Gallery photos: 1920x1080px minimum (16:9) or 1600x1200px (4:3)
  - Athlete photos: 800x800px (square) or 800x1000px (portrait)
- **File Size**: 
  - Gallery photos: < 500KB
  - Athlete photos: < 200KB
- **Optimization**: Compress images before adding (use tools like TinyPNG, ImageOptim, or Squoosh)

## Naming Conventions

### Videos

- Use descriptive, kebab-case names: `championship-game-final-quarter.mp4`
- Include category/type in name when helpful: `practice-passing-drills.mp4`, `training-core-workout.mp4`
- Thumbnails: Same name with `.jpg` extension

### Photos

- Use descriptive, kebab-case names matching the content: `team-celebration.jpg`
- Gallery photos: Match the context (team, event, season, etc.)
- Athlete photos: `{first-name}-{last-name}.jpg` format

## Adding New Assets

### Adding a New Video:

1. Add video file to `public/demo-assets/videos/`
2. Add corresponding entry to `src/data/fake/mockVideos.ts`:
   ```typescript
   {
     id: 'mock-video-N',
     // ... other fields
     video_url: getVideoAssetUrl('your-video-name.mp4'),
     thumbnail_url: getVideoThumbnailUrl('your-video-name.mp4'),
   }
   ```

### Adding a New Photo:

1. Add photo file to `public/demo-assets/photos/`
2. Add corresponding entry to `src/data/fake/mockGalleries.ts`:
   ```typescript
   {
     id: 'mock-photo-N',
     storage_path: getPhotoAssetUrl('your-photo-name.jpg'),
     filename: 'your-photo-name.jpg',
     // ... other fields
   }
   ```

### Adding a New Athlete Photo:

1. Add photo file to `public/demo-assets/athlete-photos/`
2. Update the athlete entry in `src/data/fake/fakeUsers.ts`:
   ```typescript
   {
     id: 'athlete-id',
     // ... other fields
     photo_url: getAthletePhotoUrl('first-name-last-name.jpg'),
   }
   ```

## File Organization Tips

- **Group by feature**: Keep videos, photos, and athlete-photos in separate folders
- **Use descriptive names**: Make it easy to identify what each asset represents
- **Maintain consistency**: Follow the naming conventions above
- **Optimize files**: Compress images and videos before adding to reduce bundle size
- **Version control**: Consider adding large video files to `.gitignore` and using Git LFS if needed

## Troubleshooting

### Assets Not Loading

- Check that files are in the correct directory (`public/demo-assets/...`)
- Verify filenames match exactly (case-sensitive)
- Ensure file paths in code use forward slashes (`/demo-assets/...`)
- Check browser console for 404 errors

### Broken Images/Videos

- Verify file format is supported (MP4 for videos, JPG/PNG for images)
- Check file size isn't too large (may timeout)
- Ensure file isn't corrupted
- Verify path references in code match actual filenames

### Performance Issues

- Optimize images (compress JPGs, use WebP if supported)
- Compress videos (use H.264 codec, reduce resolution if needed)
- Consider lazy loading for large galleries
- Use CDN or static hosting for production if needed

## Notes

- All paths are relative to `/public` folder (served at root `/`)
- Assets are only used when `USE_FAKE_DATA=true`
- In production with real Supabase, these assets are not used
- You can safely delete and replace any asset file without code changes
- Keep original high-quality assets elsewhere for future use
