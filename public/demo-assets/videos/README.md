# Video Assets Directory

## Important: Large Files

**Video files (.mp4, .mov, .webm) are excluded from Git** because they exceed GitHub's 100MB file size limit.

### Current Status

- ✅ **Thumbnails (.jpg)**: Small image files (< 10MB) - **committed to Git**
- ❌ **Video files (.mp4, .mov)**: Large files (> 50MB) - **excluded from Git**

### Adding Video Files

Video files should be added **locally only** and not committed to the repository:

1. Place video files in this directory with the exact filenames:
   - `championship-game-final-quarter.mp4`
   - `practice-passing-drills.mp4`
   - `training-core-workout.mp4`
   - `highlights-season-2024.mp4`
   - `event-tournament-opening.mp4`

2. **Do NOT commit video files** - they are automatically ignored by `.gitignore`

3. For production deployments, upload videos to:
   - Supabase Storage (recommended)
   - CDN (Cloudflare, AWS CloudFront, etc.)
   - Or use a video hosting service (Mux, Vimeo, etc.)

### Thumbnails

Thumbnail images (.jpg) should be:
- **Size**: 1280x720px (16:9 aspect ratio)
- **Format**: JPG (optimized)
- **File Size**: < 5MB each
- **Naming**: Same base name as video file (e.g., `video-name.mp4` → `video-name.jpg`)

### Recommended Video Specifications

- **Format**: MP4 (H.264 codec)
- **Resolution**: 720p (1280x720) or 1080p (1920x1080)
- **Aspect Ratio**: 16:9
- **Frame Rate**: 30fps
- **File Size**: Keep under 50MB per video for reasonable load times
- **Duration**: 30 seconds to 2 minutes for demo purposes

### Why Videos Are Excluded

GitHub has a **100MB file size limit**. The demo video files exceed this limit, so they are:
- Excluded from Git via `.gitignore`
- Not tracked in version control
- Must be added locally for development/testing
- Should be hosted externally for production

### For Team Members

When cloning the repository:
1. Video files will **not** be included
2. Thumbnail images **will** be included
3. To add videos locally, download them from a shared location or create your own
4. Videos are only needed when `USE_FAKE_DATA=true` is set
