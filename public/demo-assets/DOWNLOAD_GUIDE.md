# Download Guide for Demo Assets

This guide provides multiple methods to obtain placeholder or real assets for the demo mode.

## Quick Start: Placeholder Images

The simplest approach is to use placeholder images that will work immediately:

### Option 1: Run the Download Script (Windows PowerShell)

```powershell
cd public/demo-assets
.\download-assets.ps1
```

### Option 2: Run the Download Script (Node.js)

```bash
cd public/demo-assets
node download-assets.js
```

Both scripts will download placeholder images from placeholder.com (works immediately, no API keys needed).

### Option 2: Manual Download from Free Sources

#### For Photos (Gallery & Athletes)

**Pexels** (Free, no attribution required):
- Visit: https://www.pexels.com/search/sports/
- Download images matching these themes:
  - Team celebrations, huddles
  - Soccer/football action shots
  - Player portraits
  - Tournament/trophy photos
  - Facility/equipment photos

**Unsplash** (Free, no attribution required):
- Visit: https://unsplash.com/s/photos/youth-sports
- Search for: "youth soccer", "team sports", "athletes", etc.

**Recommended Search Terms:**
- `team-celebration.jpg`: "team celebration", "sports team"
- `team-huddle.jpg`: "team huddle", "sports huddle"
- `players-action.jpg`: "soccer action", "football players"
- `soccer-action.jpg`: "soccer game", "football match"
- `team-warmup.jpg`: "team warmup", "sports warmup"
- `player-portrait.jpg`: "young athlete", "sports portrait"
- `tournament-field.jpg`: "soccer field", "sports field"
- `tournament-trophy.jpg`: "sports trophy", "championship"
- `facility-exterior.jpg`: "sports facility", "stadium"
- `equipment-room.jpg`: "sports equipment", "locker room"

#### For Videos

**Recommended Free Sources:**

1. **Mixkit** (Free, no attribution):
   - Visit: https://mixkit.co/free-stock-video/
   - Search: "soccer", "sports", "team"
   - Example: "Young Soccer players training" (720p MP4, 15 seconds)
   - Direct download available

2. **Pexels Videos** (Free):
   - Visit: https://www.pexels.com/videos/
   - Search for: "soccer", "football", "sports", "team"
   - Download MP4 format, 720p or 1080p
   - Recommended duration: 30 seconds to 2 minutes

3. **Other Free Sources:**
   - https://pixabay.com/videos/ (free videos)
   - https://coverr.co/ (free stock videos)
   - https://www.videvo.net/ (free stock videos)

**Quick Download Links:**
- Mixkit Soccer: https://mixkit.co/free-stock-video/soccer/
- Pexels Sports: https://www.pexels.com/videos/search/sports/

**Video Requirements:**
- Format: MP4 (H.264 codec)
- Resolution: 720p (1280x720) or 1080p (1920x1080)
- Aspect Ratio: 16:9
- Duration: 30 seconds - 2 minutes
- File Size: Keep under 50MB

#### For Athlete Photos

**Pexels Portraits**:
- Visit: https://www.pexels.com/search/portrait/
- Search for: "young person", "teenager", "child portrait"
- Use square or portrait orientation (800x800px or 800x1000px)

**Recommended:**
- Use diverse, age-appropriate photos (ages 6-17)
- Square format works best (800x800px)
- Professional or casual sports attire

## File Naming

Make sure to use **exact filenames** as referenced in the code:

### Videos (`public/demo-assets/videos/`)
- `championship-game-final-quarter.mp4`
- `championship-game-final-quarter.jpg` (thumbnail)
- `practice-passing-drills.mp4`
- `practice-passing-drills.jpg` (thumbnail)
- `training-core-workout.mp4`
- `training-core-workout.jpg` (thumbnail)
- `highlights-season-2024.mp4`
- `highlights-season-2024.jpg` (thumbnail)
- `event-tournament-opening.mp4`
- `event-tournament-opening.jpg` (thumbnail)

### Photos (`public/demo-assets/photos/`)
- `team-celebration.jpg`
- `team-huddle.jpg`
- `players-action.jpg`
- `soccer-action.jpg`
- `team-warmup.jpg`
- `player-portrait.jpg`
- `tournament-field.jpg`
- `tournament-trophy.jpg`
- `facility-exterior.jpg`
- `equipment-room.jpg`

### Athlete Photos (`public/demo-assets/athlete-photos/`)
- `emma-johnson.jpg`
- `liam-johnson.jpg`
- `olivia-smith.jpg`
- `noah-smith.jpg`
- `ava-williams.jpg`
- `ethan-williams.jpg`
- `sophia-chen.jpg`
- `mason-rodriguez.jpg`
- `isabella-rodriguez.jpg`
- `aiden-patel.jpg`

## Using Real Assets

If you have your own photos/videos:

1. **Optimize Images:**
   - Use tools like TinyPNG, ImageOptim, or Squoosh
   - Compress JPGs to < 500KB for gallery photos
   - Compress athlete photos to < 200KB

2. **Optimize Videos:**
   - Use HandBrake or FFmpeg to compress videos
   - Target: H.264 codec, 720p or 1080p
   - Keep file sizes under 50MB

3. **Create Thumbnails:**
   - Extract frame from video at specified timestamp
   - Use FFmpeg: `ffmpeg -i video.mp4 -ss 00:00:30 -vframes 1 thumbnail.jpg`
   - Resize to 1280x720px

## Quick Placeholder Solution

If you just need something to work immediately, you can use placeholder.com URLs:

### For Images:
Replace any image URL with:
```
https://via.placeholder.com/WIDTHxHEIGHT.jpg?text=TEXT
```

Example:
- `https://via.placeholder.com/1920x1080.jpg?text=Team+Celebration`
- `https://via.placeholder.com/800x800.jpg?text=Emma+Johnson`

### For Videos:
Use sample video URLs:
- https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4
- https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4

## Automated Download Script

A Node.js script is provided (`download-assets.js`) that will:
1. Download placeholder images for all required files
2. Create proper directory structure
3. Use correct filenames

**To use:**
```bash
cd public/demo-assets
node download-assets.js
```

**Note:** The script uses placeholder.com which doesn't require API keys. For real assets, modify the URLs in the script to point to your preferred source.

## Verification

After adding assets, verify they work:

1. Set `VITE_USE_FAKE_DATA=true` in `.env`
2. Start the dev server
3. Navigate to:
   - Video Library page
   - Photo Gallery page
   - Athletes page
4. Check that images/videos load correctly

## Troubleshooting

**Images not loading:**
- Check file paths are correct (case-sensitive)
- Verify files are in `public/demo-assets/` subdirectories
- Check browser console for 404 errors
- Ensure filenames match exactly (including extension)

**Videos not playing:**
- Verify video format is MP4 (H.264)
- Check file isn't corrupted
- Ensure video player component supports the format
- Check browser console for errors

**Large file sizes:**
- Compress images before adding
- Use video compression tools
- Consider using WebP format for images (if supported)
- Use CDN for production deployment
