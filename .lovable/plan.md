

## Display Source Bid Names for QC in Data Table

### Overview
Preserve and display the individual bid names from Notion that contribute to each episode's totals, allowing users to visually verify which bids are included in the calculations.

---

### Current State Analysis

**Good news**: The Notion proxy already fetches bid names from the "Bid Name" property (line 215 in `notion-proxy/index.ts`).

**Problem**: The bid names are lost during data processing in `useNotionResourceData.ts`. When multiple bids are aggregated for an episode (lines 165-170), only the man-day values are summed - the individual bid identifiers are discarded.

**Data Flow**:
```
Notion Bids DB → notion-proxy (has bid names) 
    → useNotionResourceData (loses bid names during aggregation) 
    → episodes array (no bid names)
    → ResourceDataTable (cannot display what it doesn't have)
```

---

### Technical Solution

#### 1. Add Type for Bid Reference

**File: `src/types/resource.ts`**

Add a new interface to track source bids:

```typescript
export interface BidReference {
  id: string;
  name: string;
  animationDays: number;
  cgDays: number;
  compositingDays: number;
  fxDays: number;
}
```

Extend `NotionEpisode` to include source bids:

```typescript
export interface NotionEpisode {
  // ... existing fields ...
  sourceBids?: BidReference[];  // Track which bids contributed
}
```

#### 2. Preserve Bid Names During Aggregation

**File: `src/hooks/useNotionResourceData.ts`**

In the `fetchBudgets` function, modify the aggregation logic to preserve bid references:

```typescript
// When creating/updating an episode entry
if (existing) {
  existing.animationDays += scaledAnimationDays;
  // ... other days ...
  existing.sourceBids = existing.sourceBids || [];
  existing.sourceBids.push({
    id: budget.id,
    name: budget.name,
    animationDays: scaledAnimationDays,
    cgDays: scaledCgDays,
    compositingDays: scaledCompositingDays,
    fxDays: scaledFxDays,
  });
} else {
  episodeMap.set(key, {
    // ... existing fields ...
    sourceBids: [{
      id: budget.id,
      name: budget.name,
      animationDays: scaledAnimationDays,
      cgDays: scaledCgDays,
      compositingDays: scaledCompositingDays,
      fxDays: scaledFxDays,
    }],
  });
}
```

#### 3. Display Bid Names in Data Table

**File: `src/components/resource/ResourceDataTable.tsx`**

Add a collapsible section below the table showing included bids:

```typescript
// Calculate included bids from filtered episodes
const includedBids = useMemo(() => {
  const bids: BidReference[] = [];
  filteredProjects.forEach(project => {
    // Get episodes for this project
    let projectEpisodes = episodes.filter(...);
    if (filters.episodeId) {
      projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
    }
    projectEpisodes.forEach(ep => {
      if (ep.sourceBids) {
        bids.push(...ep.sourceBids);
      }
    });
  });
  return bids;
}, [filteredProjects, episodes, filters]);
```

Display below the table:

```tsx
{/* Source Bids Section */}
<div className="mt-2 px-1">
  <details className="text-[9px]">
    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
      Source Bids ({includedBids.length})
    </summary>
    <div className="mt-1 p-2 bg-muted/20 rounded-md max-h-[100px] overflow-y-auto">
      {includedBids.map(bid => (
        <div key={bid.id} className="flex justify-between py-0.5 border-b border-muted/30 last:border-0">
          <span className="font-medium">{bid.name}</span>
          <span className="text-muted-foreground">
            ANM: {bid.animationDays} | CG: {bid.cgDays} | COMP: {bid.compositingDays} | FX: {bid.fxDays}
          </span>
        </div>
      ))}
      {includedBids.length === 0 && (
        <span className="text-muted-foreground">No bids found for current selection</span>
      )}
    </div>
  </details>
</div>
```

---

### Implementation Steps

1. **Update `src/types/resource.ts`**
   - Add `BidReference` interface
   - Add optional `sourceBids` field to `NotionEpisode`

2. **Update `src/hooks/useNotionResourceData.ts`**
   - Modify budget aggregation to preserve bid references
   - Include bid name and per-department values in the reference

3. **Update `src/components/resource/ResourceDataTable.tsx`**
   - Add `useMemo` to collect included bids from filtered episodes
   - Add collapsible details section below the table
   - Display bid names with their individual department values

---

### Expected Result

For MRCL_201 with two bids:
- The "Source Bids" section will expand to show both bid names
- Each bid shows its individual contribution: `ANM: 45 | CG: 30 | COMP: 20 | FX: 10`
- The Bid column totals will match the sum of these individual values
- Filtering to a different episode will update the displayed bids

---

### No New Database Tables Required

This solution modifies the in-memory data structures only. The bid information is already available in the Notion API response - we just need to preserve it through the processing pipeline and display it in the UI.

