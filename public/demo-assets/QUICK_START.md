# Quick Start: Adding Demo Assets

## Current Status

The demo assets infrastructure is set up and ready. You need to add actual image/video files to make it work.

## What You Need to Do

### Step 1: Download Assets

You have three options:

**Option A: Use Free Stock Sources (Recommended)**
- Photos: Visit https://www.pexels.com/search/sports/ and download images
- Videos: Visit https://mixkit.co/free-stock-video/soccer/ and download MP4 files
- Portraits: Visit https://www.pexels.com/search/portrait/ for athlete photos

**Option B: Use Your Own Assets**
- Use your own photos/videos
- Optimize them (compress images, resize videos)
- Follow naming conventions below

**Option C: Use Placeholder Service**
- Visit https://via.placeholder.com/ to generate placeholder images
- Use exact dimensions specified in REQUIRED_FILES.txt

### Step 2: Place Files in Correct Directories

```
public/demo-assets/
├── videos/              ← Place .mp4 files and .jpg thumbnails here
├── photos/              ← Place gallery photos here
└── athlete-photos/      ← Place athlete profile photos here
```

### Step 3: Use Exact Filenames

**Critical:** Filenames must match exactly (case-sensitive). See `REQUIRED_FILES.txt` for complete list.

### Step 4: Test

1. Set `VITE_USE_FAKE_DATA=true` in `.env`
2. Start dev server: `npm run dev`
3. Navigate to:
   - Video Library page
   - Photo Gallery page  
   - Athletes page
4. Verify images/videos load correctly

## File Checklist

See `REQUIRED_FILES.txt` for complete list of required files.

**Videos:** 5 MP4 files + 5 JPG thumbnails  
**Photos:** 10 JPG files  
**Athlete Photos:** 10 JPG files  

**Total:** 30 files

## Troubleshooting

**Files not loading?**
- Check filenames match exactly (case-sensitive)
- Verify files are in correct subdirectories
- Check browser console for 404 errors
- Ensure `VITE_USE_FAKE_DATA=true` is set

**Need help?**
- See `DOWNLOAD_GUIDE.md` for detailed instructions
- See `README.md` for asset specifications
- Check `IMPLEMENTATION_SUMMARY.md` for technical details

## Next Steps After Adding Assets

1. ✅ Test all three features (Videos, Photos, Athletes)
2. ✅ Verify images display correctly
3. ✅ Verify videos play correctly
4. ✅ Replace placeholder assets with real content when ready
5. ✅ Optimize file sizes for production
