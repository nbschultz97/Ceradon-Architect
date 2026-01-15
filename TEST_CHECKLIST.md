# Test Checklist - v0.4.0-alpha.4 Features

## Browser Testing (index.html opened directly)

### ✅ Basic Functionality
- [ ] App loads without console errors
- [ ] Navigation works between all sections
- [ ] Theme toggle (🌙) switches between dark/light
- [ ] Settings button (⚙️) appears in header

### ✅ Error Handling
**Test 1: Trigger an intentional error**
- [ ] Open browser console (F12)
- [ ] Type: `throw new Error('test error')`
- [ ] Verify toast notification appears
- [ ] Check localStorage has 'cots_last_error' entry

**Test 2: Download error log**
- [ ] Open Settings (⚙️ button)
- [ ] Scroll to "Advanced" section
- [ ] Click "Download Error Log"
- [ ] Verify JSON file downloads

### ✅ Settings Panel
**Test 1: Open Settings**
- [ ] Click settings gear icon (⚙️)
- [ ] Verify modal opens
- [ ] Check all sections visible (Units, Map, UI, Data, Advanced)

**Test 2: Change Settings**
- [ ] Change distance units to Imperial
- [ ] Change theme to Light Mode (if currently Dark)
- [ ] Check "Confirm before deleting items"
- [ ] Click "Save Settings"
- [ ] Verify toast notification "Settings saved successfully"
- [ ] Refresh page (F5)
- [ ] Open settings again - verify changes persisted

**Test 3: Export/Import Settings**
- [ ] Click "Export Settings" button
- [ ] Verify JSON file downloads
- [ ] Change a few settings
- [ ] Click "Import Settings", select the exported file
- [ ] Verify toast "Settings imported successfully"
- [ ] Verify settings reverted to exported values

**Test 4: Reset to Defaults**
- [ ] Make several custom changes
- [ ] Click "Reset to Defaults"
- [ ] Confirm the dialog
- [ ] Verify settings reset (check units = metric, theme = dark)

### ✅ Enhanced SRTM Elevation
**Test 1: Check fallback data loads**
- [ ] Open browser console
- [ ] Type: `SRTMFallback.getEstimatedElevation(38, -105)`
- [ ] Should return ~2400 (Rocky Mountains)
- [ ] Type: `SRTMFallback.getEstimatedElevation(40, -74)`
- [ ] Should return ~100 (East Coast lowlands)

**Test 2: Terrain classification**
- [ ] Type: `SRTMFallback.getTerrainType(45, -110)`
- [ ] Should return 'mountains' (Rockies)
- [ ] Type: `SRTMFallback.getTerrainType(30, 80)`
- [ ] Should return 'mountains' (Himalayas)

**Test 3: Terrain description**
- [ ] Type: `SRTMFallback.getTerrainDescription(38, -105)`
- [ ] Should show "Mountainous terrain at approximately XXXX m..."

### ✅ Mission Cards PDF Export
**Prerequisites**: Create a test mission first
1. Load sample mission (Home > "Load Sample Mission" button) OR
2. Create a manual mission:
   - Go to Mission Planner
   - Add mission name "Test Mission 48hr"
   - Add 3-4 phases with names like "Transit", "Survey", "Loiter", "Return"
   - Set durations (e.g., 30, 60, 45, 20 minutes)
   - Save mission

**Test 1: Export as PDF**
- [ ] Go to Export section
- [ ] Find "Mission Cards" card
- [ ] Click "📄 Export as PDF"
- [ ] Verify PDF downloads
- [ ] Open PDF - check:
  - [ ] Title page with mission name
  - [ ] All phases appear as cards
  - [ ] Icons display correctly (🚁, ➡️, 📷, etc.)
  - [ ] Phase numbers correct (Phase 1 of 4, etc.)
  - [ ] Duration and time windows shown
  - [ ] Location and altitude data present

**Test 2: Print Cards**
- [ ] Click "🖨️ Print Cards"
- [ ] Verify print preview window opens
- [ ] Check cards are formatted correctly
- [ ] Close print dialog

**Test 3: Export as JSON**
- [ ] Click "💾 Export as JSON"
- [ ] Verify JSON file downloads
- [ ] Open JSON - check structure has:
  - [ ] missionName
  - [ ] totalPhases
  - [ ] cards array with phase data

### ✅ Undo/Redo (Basic)
**Note**: Full undo/redo requires command wrappers - testing keyboard shortcuts only

**Test 1: Keyboard shortcuts work**
- [ ] Press Ctrl+Z (or Cmd+Z on Mac)
- [ ] Verify toast "Nothing to undo" appears (no commands yet)
- [ ] Press Ctrl+Y or Ctrl+Shift+Z
- [ ] Verify toast "Nothing to redo" appears

**Test 2: Check manager loaded**
- [ ] Open console
- [ ] Type: `UndoRedoManager`
- [ ] Should show object with undo, redo, canUndo, canRedo functions

### ✅ Overall Integration
**Test 1: Sample Data Workflow**
- [ ] Click "Load Sample Mission" on home page
- [ ] Navigate to Parts Library - verify parts loaded
- [ ] Navigate to Platform Designer - verify designs loaded
- [ ] Navigate to Mission Planner - verify mission phases present
- [ ] Navigate to Comms Validator - verify map loads
- [ ] Navigate to Export - verify Mission Cards buttons appear

**Test 2: Console Errors**
- [ ] Check browser console (F12 > Console tab)
- [ ] Verify no critical errors (warnings OK)
- [ ] Look for:
  - [ErrorHandler] Global error handlers installed ✅
  - [SettingsManager] Settings loaded ✅
  - Module initialization messages ✅

---

## Desktop App Testing (Electron)

### Prerequisites
Run: `npm run desktop:dev`

### ✅ Desktop-Specific Features
- [ ] App opens without errors
- [ ] Settings button works
- [ ] Mission cards export works
- [ ] No "prompt() not supported" errors
- [ ] DevTools open automatically (dev mode)
- [ ] Web-only demo banner HIDDEN
- [ ] Desktop-mode class applied to body

### ✅ Settings Persistence
- [ ] Change settings, close app
- [ ] Reopen app
- [ ] Verify settings persisted

---

## Known Limitations (Expected)

1. **Undo/Redo**: Foundation only - no commands wrapped yet
   - Keyboard shortcuts work but have nothing to undo/redo
   - Full implementation requires wrapping operations with command objects

2. **Advanced Filtering**: Not implemented
   - Parts Library uses basic search only
   - Multi-criteria filtering planned for future release

3. **SRTM Tiles**: Fallback only
   - No actual SRTM .hgt files bundled
   - Uses pre-defined elevation zones (50+ regions)
   - Good estimates but not precise

---

## Success Criteria

**PASS** if:
- ✅ All core features work without crashes
- ✅ Settings panel opens and saves preferences
- ✅ Error handler catches errors and shows toasts
- ✅ Mission cards export produces valid PDF
- ✅ SRTM fallback returns reasonable elevations
- ✅ No critical console errors

**FAIL** if:
- ❌ App won't load / white screen
- ❌ Settings don't persist after refresh
- ❌ Mission cards PDF generation crashes
- ❌ Critical JavaScript errors in console
- ❌ Settings modal won't open

---

## Bug Report Template

If you find issues, report with:

```
**Feature**: [Which feature has the issue]
**Steps to Reproduce**:
1.
2.
3.

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Console Errors**: [Any errors from F12 console]
**Browser**: [Chrome/Firefox/Edge/etc. + version]
```

---

## Next Steps After Testing

1. ✅ Fix any critical bugs found
2. ✅ Update version numbers:
   - package.json
   - version.json
   - app.js APP_VERSION constant
3. ✅ Update CHANGELOG.md
4. ✅ Build desktop installer: `npm run desktop:dist`
5. ✅ Test desktop installer
6. ✅ Commit and push to GitHub
7. ✅ Verify GitHub Pages deployment
