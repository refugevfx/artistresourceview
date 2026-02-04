

## Fix Distribution Curve Integration Math

### Problem Identified

The distribution calculation produces **inflated totals** (e.g., 29 bid days becoming 32 distributed days) because the linear interpolation approach doesn't preserve the mathematical integral of the curve.

**Current Logic (flawed)**:
```
Daily Need = (Total Man-Days / Working Days) × interpolatedWeight × 5
```

The `× 5` factor assumes the average interpolated weight equals 0.2 (since 5 × 0.2 = 1.0). However, linear interpolation between 5 control points creates a curve whose **integral** differs from the **average of the 5 points**.

**Mathematical Proof (FX curve as example)**:

| Segment | Start | End | Trapezoidal Area |
|---------|-------|-----|------------------|
| 0% → 25% | 0.01 | 0.20 | (0.01+0.20)/2 × 0.25 = 0.02625 |
| 25% → 50% | 0.20 | 0.58 | (0.20+0.58)/2 × 0.25 = 0.0975 |
| 50% → 75% | 0.58 | 0.20 | (0.58+0.20)/2 × 0.25 = 0.0975 |
| 75% → 100% | 0.20 | 0.01 | (0.20+0.01)/2 × 0.25 = 0.02625 |
| **Total** | | | **0.2475** |

With the `× 5` multiplier: 0.2475 × 5 = **1.2375** (23.75% inflation!)

This is why your FX days (27.0 input) become 33.4 distributed (27 × 1.237 ≈ 33.4).

---

### Solution: Normalize by Actual Curve Integral

Instead of assuming `× 5` works universally, calculate the **actual integral** of each curve and use that for normalization.

**Corrected Formula**:
```
Daily Need = (Total Man-Days / Working Days) × (interpolatedWeight / curveIntegral)
```

Where `curveIntegral` is the trapezoidal integral of the interpolated curve.

---

### Technical Implementation

**File: `src/lib/resourceCalculations.ts`**

**1. Add Curve Integral Calculator**:

```typescript
// Calculate the trapezoidal integral of a 5-point curve
function calculateCurveIntegral(curve: DistributionCurve): number {
  // Points are at [0, 0.25, 0.5, 0.75, 1.0]
  // Trapezoidal integration: sum of (y1 + y2) / 2 × width for each segment
  const segmentWidth = 0.25;
  let integral = 0;
  for (let i = 0; i < 4; i++) {
    integral += (curve[i] + curve[i + 1]) / 2 * segmentWidth;
  }
  return integral;
}
```

**2. Modify `calculateEpisodeNeeds` Function**:

Replace the `× 5` factor with division by the actual curve integral:

```typescript
export function calculateEpisodeNeeds(
  episode: NotionEpisode,
  curveSettings: DepartmentCurveSettings
): Map<string, { animation: number; cg: number; compositing: number; fx: number }> {
  // ... existing setup code ...
  
  // Pre-calculate curve integrals for normalization
  const animIntegral = calculateCurveIntegral(curveSettings.Animation);
  const cgIntegral = calculateCurveIntegral(curveSettings.CG);
  const compIntegral = calculateCurveIntegral(curveSettings.Compositing);
  const fxIntegral = calculateCurveIntegral(curveSettings.FX);
  
  workingDays.forEach((day, index) => {
    const position = index / (totalWorkingDays - 1 || 1);
    const dateKey = format(day, 'yyyy-MM-dd');
    
    const animWeight = interpolateCurve(curveSettings.Animation, position);
    const cgWeight = interpolateCurve(curveSettings.CG, position);
    const compWeight = interpolateCurve(curveSettings.Compositing, position);
    const fxWeight = interpolateCurve(curveSettings.FX, position);
    
    // Normalize by actual curve integral instead of assuming × 5
    const avgAnimDaily = episode.animationDays / totalWorkingDays;
    const avgCgDaily = episode.cgDays / totalWorkingDays;
    const avgCompDaily = episode.compositingDays / totalWorkingDays;
    const avgFxDaily = episode.fxDays / totalWorkingDays;
    
    dailyNeeds.set(dateKey, {
      animation: avgAnimDaily * animWeight / animIntegral,
      cg: avgCgDaily * cgWeight / cgIntegral,
      compositing: avgCompDaily * compWeight / compIntegral,
      fx: avgFxDaily * fxWeight / fxIntegral,
    });
  });
  
  // ...
}
```

---

### Expected Integral Values for Default Curves

| Department | Curve | Calculated Integral |
|------------|-------|---------------------|
| Animation | [0.10, 0.30, 0.30, 0.20, 0.10] | 0.20 |
| CG | [0.10, 0.30, 0.30, 0.20, 0.10] | 0.20 |
| Compositing | [0.10, 0.11, 0.30, 0.38, 0.11] | 0.20 |
| FX | [0.01, 0.20, 0.58, 0.20, 0.01] | 0.2475 |

With the fix:
- Animation/CG/Compositing: Still use `weight / 0.20` (equivalent to `× 5`)
- FX: Will use `weight / 0.2475` (≈ `× 4.04`) - properly scaled down

---

### Why This Works

The normalization ensures that when you sum all the distributed daily values across all working days, you get back exactly the original total man-days (within floating-point precision).

**Verification**:
- Sum of daily Animation = Σ(avgAnimDaily × animWeight / animIntegral)
- = avgAnimDaily / animIntegral × Σ(animWeight)
- Since Σ(animWeight) across all positions ≈ integral × totalWorkingDays
- = avgAnimDaily / animIntegral × integral × totalWorkingDays
- = (animationDays / totalWorkingDays) × totalWorkingDays
- = **animationDays** ✓

---

### Implementation Checklist

1. Add `calculateCurveIntegral()` helper function
2. Modify `calculateEpisodeNeeds()` to use proper normalization
3. Remove the `× 5` magic number
4. Test with MRCL_201 to verify cumulative totals match bid totals

