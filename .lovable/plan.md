

# Checker Page for Resource Calculation Debugging

## Overview

Create a new `/checker` route that duplicates the Resource Curves dashboard and adds a debugging section below showing aggregated totals per department. This will help validate the calculation logic by displaying raw data pulled from Notion.

## What Gets Created

### 1. New Page: `src/pages/Checker.tsx`
- Uses the same `useNotionResourceData` hook as the home page
- Renders the full ResourceDashboard at the top (same as home page)
- Adds a new "Calculation Checker" section below with aggregated totals

### 2. New Component: `src/components/checker/CalculationChecker.tsx`
A debugging panel that displays:
- **Raw Episode Data** for the filtered selection:
  - Episode name/code
  - Start date → End date
  - Total working days calculated
  - Man-days per department (Animation, CG, Comp, FX)
- **Aggregated Totals** section showing:
  - Sum of Animation man-days
  - Sum of CG man-days
  - Sum of Compositing man-days
  - Sum of FX man-days
- Updates dynamically as filters change (project, episode, status)

### 3. Route Registration in `App.tsx`
- Add `/checker` as a protected route
- Uses same auth protection as the home page

## Technical Approach

```text
┌─────────────────────────────────────────────────────────────┐
│  /checker                                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ResourceDashboard (identical to home page)          │   │
│  │  - Chart, filters, bookings, data table              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CalculationChecker (NEW)                            │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Aggregated Totals Card                         │ │   │
│  │  │  Animation: 245 days | CG: 180 days             │ │   │
│  │  │  Comp: 312 days     | FX: 95 days               │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │  Episode Breakdown Table                        │ │   │
│  │  │  Episode | Start | End | Days | ANM | CG | ...  │ │   │
│  │  │  MRCL_201| 2026..| ... | 65   | 120 | 80 | ...  │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

The CalculationChecker will receive:
- `episodes` - Raw episode data with man-days from Notion
- `filters` - Current filter state (projectId, episodeId, statuses)
- `curveSettings` - Current distribution curve settings

It will calculate and display:
1. **Filtered episodes** based on current project/episode selection
2. **Working day count** for each episode (using same logic as resourceCalculations.ts)
3. **Aggregated totals** summing man-days across all filtered episodes

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Checker.tsx` | Create | New page with dashboard + checker |
| `src/components/checker/CalculationChecker.tsx` | Create | Debugging panel component |
| `src/App.tsx` | Modify | Add `/checker` route |

## What Stays Unchanged

- `src/pages/Index.tsx` - No changes
- `src/components/resource/ResourceDashboard.tsx` - No changes  
- `src/lib/resourceCalculations.ts` - No changes to formulas
- `src/hooks/useNotionResourceData.ts` - No changes

