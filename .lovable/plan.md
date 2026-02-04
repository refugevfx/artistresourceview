

## Display Raw Bid Day Totals in Data Table

### Overview
Add a reference column next to each department row in the TOTALS section that shows the **raw bid day totals** from Notion (the original input values before distribution calculations). This provides a verification reference to compare distributed values against the original source data.

---

### User Experience

**Visual Design**: Display the raw bid total in parentheses or a separate column next to the department label in the TOTALS section.

For example, the current view:
```
TOTALS          | Jan 26 | Feb 26 | ...
  ANM           |   -    |   -    | ...
  CG            |   -    |   -    | ...
```

Proposed view:
```
TOTALS          | Total | Jan 26 | Feb 26 | ...
  ANM (127.6)   |   -   |   -    |   -    | ...
  CG (165.5)    |   -   |   -    |   -    | ...
```

Or alternatively, add a dedicated "Total" column:
```
TOTALS          | Bid  | Jan 26 | Feb 26 | ...
  ANM           | 128  |   -    |   -    | ...
  CG            | 166  |   -    |   -    | ...
```

The second approach (dedicated "Bid" column) is cleaner and easier to compare.

---

### Technical Approach

#### File: `src/components/resource/ResourceDataTable.tsx`

**1. Calculate Raw Bid Totals**

Add a new `useMemo` hook to sum the raw bid day values from the filtered episodes:

```typescript
// Calculate raw bid totals from Notion data (before distribution)
const rawBidTotals = useMemo(() => {
  let animation = 0, cg = 0, compositing = 0, fx = 0;
  
  filteredProjects.forEach(project => {
    const projectIds = [project.id];
    projects.forEach(p => {
      if (p.parentId === project.id) projectIds.push(p.id);
    });
    
    let projectEpisodes = episodes.filter(ep => projectIds.includes(ep.projectId));
    if (filters.episodeId) {
      projectEpisodes = projectEpisodes.filter(ep => ep.id === filters.episodeId);
    }
    
    projectEpisodes.forEach(ep => {
      animation += ep.animationDays;
      cg += ep.cgDays;
      compositing += ep.compositingDays;
      fx += ep.fxDays;
    });
  });
  
  return { animation, cg, compositing, fx };
}, [filteredProjects, projects, episodes, filters.episodeId]);
```

**2. Add Raw Bid Totals Per Project**

Extend the `ProjectMonthlyData` interface and calculation to include per-project raw bid totals:

```typescript
interface ProjectMonthlyData {
  projectId: string;
  projectName: string;
  months: Map<string, MonthlyData>;
  rawBidTotals: MonthlyData;  // Add this field
}
```

**3. Add "Bid" Column to Table Header**

Insert a new column between "Project / Dept" and the first month:

```typescript
<TableHeader>
  <TableRow className="h-6">
    <TableHead className="sticky left-0 z-10 bg-background min-w-[120px] py-1 text-[9px]">
      Project / Dept
      <span className="text-muted-foreground ml-1">
        ({displayMode === 'avgArtists' ? 'avg' : 'days'}{aggregationMode === 'cumulative' ? ', cum' : ''})
      </span>
    </TableHead>
    <TableHead className="text-center min-w-[45px] py-1 text-[9px] bg-muted/20">
      Bid
    </TableHead>
    {months.map(m => (
      <TableHead key={m.key} className="text-center min-w-[45px] py-1 text-[9px]">
        {m.label}
      </TableHead>
    ))}
  </TableRow>
</TableHeader>
```

**4. Display Raw Values in TOTALS Section**

In the department rows under TOTALS, add a cell for the raw bid total:

```typescript
{DEPARTMENTS.map(dept => (
  <TableRow key={`total-${dept.key}`} className="bg-muted/30 h-5">
    <TableCell className={`sticky left-0 z-10 bg-muted/30 pl-4 py-0.5 ${dept.color}`}>
      {dept.label}
    </TableCell>
    <TableCell className={`text-center font-medium py-0.5 bg-muted/20 ${dept.color}`}>
      {rawBidTotals[dept.key].toFixed(1)}
    </TableCell>
    {months.map(m => {
      const val = totals.get(m.key)?.[dept.key] || 0;
      return (
        <TableCell key={m.key} className={`text-center font-medium py-0.5 ${dept.color}`}>
          {formatValue(val)}
        </TableCell>
      );
    })}
  </TableRow>
))}
```

**5. Display Raw Values in Project Rows**

Similarly, add bid totals for each project's department rows.

---

### Implementation Summary

1. Add `rawBidTotals` useMemo to calculate sum of raw episode bid days
2. Extend `ProjectMonthlyData` to include per-project raw bid totals
3. Add "Bid" column header between "Project / Dept" and first month
4. Add cells in TOTALS department rows showing raw bid values
5. Add cells in project department rows showing per-project raw bid values
6. Use distinct styling (e.g., `bg-muted/20`) for the Bid column to visually separate it from calculated months

---

### Mapping for Department Keys

The `DEPARTMENTS` array uses lowercase keys (`animation`, `cg`, `compositing`, `fx`) which need to map to episode properties (`animationDays`, `cgDays`, `compositingDays`, `fxDays`).

---

### Expected Result

When viewing "Bad Monkey S2" with all episodes:
- The "Bid" column will show the sum of all episode bid days per department
- For example, if ANM has 127.6 total days across all episodes, it shows "128" in the Bid column
- When filtering to a single episode, the Bid column updates to show just that episode's values
- The monthly columns continue to show distributed/calculated values based on the current display mode

