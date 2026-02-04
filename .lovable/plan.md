

## Add Data Table Display Mode Toggles

### Overview
Add two toggle controls to the Data Table view that allow switching between:
1. **Value Type**: "Average Artists" (current behavior) vs "Bid Days" (total distributed days per month)
2. **Aggregation Mode**: "Monthly" (per-month values) vs "Cumulative" (running totals)

This enables viewing total cumulative days per episode per department.

---

### User Experience

**Toggle Placement**: Both toggles will appear in the Data Table tab header area, visible only when the Data Table tab is active.

**Toggle 1 - Value Type**:
- "Avg Artists" (default) - Shows average concurrent artists needed per working day in each month
- "Bid Days" - Shows total distributed man-days falling in each month

**Toggle 2 - Aggregation Mode**:
- "Monthly" (default) - Each column shows that month's values independently
- "Cumulative" - Each column shows the running sum from the first month through that month

**Example with Cumulative Bid Days**:
| Dept | Jan | Feb | Mar |
|------|-----|-----|-----|
| COMP | 10  | 25  | 40  |

This shows that by end of March, 40 total compositing days have been distributed.

---

### Technical Approach

#### File: `src/components/resource/ResourceDataTable.tsx`

**1. Add State for Toggle Values**
```typescript
const [displayMode, setDisplayMode] = useState<'avgArtists' | 'bidDays'>('avgArtists');
const [aggregationMode, setAggregationMode] = useState<'monthly' | 'cumulative'>('monthly');
```

**2. Modify Data Calculation Logic**

Currently the code:
- Sums daily distributed values into monthly buckets
- Divides by working days to get average artists

Changes needed:
- Store BOTH the raw summed days AND the averaged values
- Apply the averaging only when `displayMode === 'avgArtists'`
- For cumulative mode, calculate running totals across months

```typescript
// Store raw sums before averaging
const rawMonthlyData = new Map<string, MonthlyData>();

// After aggregating daily needs into months (existing logic)
// Keep the raw sum before dividing

// Then conditionally apply averaging
if (displayMode === 'avgArtists') {
  // Current logic: divide by working days
}

// For cumulative mode, transform the final data
if (aggregationMode === 'cumulative') {
  // Calculate running totals across months in order
}
```

**3. Add Toggle UI Components**

Use `ToggleGroup` for a clean segmented control appearance:

```typescript
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// In the component JSX, above the ScrollArea:
<div className="flex items-center gap-3 mb-2 px-1">
  <ToggleGroup 
    type="single" 
    value={displayMode} 
    onValueChange={(v) => v && setDisplayMode(v)}
    className="h-5"
  >
    <ToggleGroupItem value="avgArtists" className="h-5 px-2 text-[9px]">
      Avg Artists
    </ToggleGroupItem>
    <ToggleGroupItem value="bidDays" className="h-5 px-2 text-[9px]">
      Bid Days
    </ToggleGroupItem>
  </ToggleGroup>

  <ToggleGroup 
    type="single" 
    value={aggregationMode} 
    onValueChange={(v) => v && setAggregationMode(v)}
    className="h-5"
  >
    <ToggleGroupItem value="monthly" className="h-5 px-2 text-[9px]">
      Monthly
    </ToggleGroupItem>
    <ToggleGroupItem value="cumulative" className="h-5 px-2 text-[9px]">
      Cumulative
    </ToggleGroupItem>
  </ToggleGroup>
</div>
```

**4. Update formatValue Function**

Adjust decimal precision based on display mode:
```typescript
const formatValue = (val: number) => {
  if (val === 0) return '-';
  // Bid Days typically larger numbers, may want different precision
  return displayMode === 'bidDays' 
    ? val.toFixed(1)  // or val.toFixed(0) for whole days
    : val.toFixed(1);
};
```

**5. Update Column Headers**

Add visual indicator of current mode in the header:
```typescript
<TableHead className="sticky left-0 z-10 bg-background min-w-[120px] py-1 text-[9px]">
  Project / Dept
  <span className="text-muted-foreground ml-1">
    ({displayMode === 'avgArtists' ? 'avg' : 'days'})
  </span>
</TableHead>
```

---

### Implementation Steps

1. Add `useState` hooks for `displayMode` and `aggregationMode`
2. Restructure `projectData` calculation to preserve raw sums before averaging
3. Add conditional logic to skip averaging when showing Bid Days
4. Add cumulative calculation step when aggregation mode is cumulative
5. Apply same logic to the `totals` calculation
6. Add ToggleGroup UI components above the table
7. Update header to indicate current display mode

---

### Edge Cases

- **Cumulative with multiple projects**: Each project's cumulative totals are independent; the TOTALS row shows cumulative sum across all projects
- **Empty months**: Zero values in cumulative mode still show the last non-zero cumulative value
- **Partial month filtering**: When viewing a single episode, cumulative shows running total for that episode only

