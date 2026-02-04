

## Fix Episode Filtering in Resource Data Table

### Problem
When selecting a specific episode in the filter dropdown, the data table numbers don't change. Only project filtering works - episode filtering is completely ignored.

### Root Cause
In `ResourceDataTable.tsx` at line 111, the episode filter value (`filters.episodeId`) is never applied when filtering episodes for calculation:

```typescript
// Current code - only filters by project, ignores episode filter
const projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
```

### Solution
Add episode filtering logic when `filters.episodeId` is set:

```typescript
let projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));

// Apply episode filter if a specific episode is selected
if (filters.episodeId) {
  projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
}
```

### File Changes

**File: `src/components/resource/ResourceDataTable.tsx`**
- Modify line 111 to add episode ID filtering
- When `filters.episodeId` is set (not null), filter the episodes array to only include the selected episode
- This ensures the monthly calculations only use data from the selected episode

### Technical Details

The fix involves:
1. Converting `const` to `let` for the `projectEpisodes` variable
2. Adding a conditional filter that checks if `filters.episodeId` is truthy
3. If set, further filter the episodes array to only include episodes where `ep.id === filters.episodeId`

### Testing
After implementation:
1. Select "Bad Monkey S2" project
2. Select "All Episodes" - should show aggregated data for all episodes
3. Select a specific episode (e.g., MRCL_201) - numbers should change to show only that episode's data
4. Select a different episode - numbers should update accordingly

