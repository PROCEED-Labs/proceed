# Zoom Curve System Documentation

## Overview

The zoom curve system is a mathematical framework that maps linear zoom inputs (0-100) to appropriate scale factors for time-based visualizations. It provides a sophisticated, controlled calculation that enables smooth transitions between vastly different time scales (years to seconds).

## Key Features

- **Wide Dynamic Range**: Spans approximately 6 orders of magnitude from min to max zoom
- **Dual-Segment Design**: Gentle curve in lower range with accelerated curve in higher range
- **Logarithmic Interpolation**: Ensures smooth transitions between time scales
- **Preset System**: Ready-to-use configurations for different zoom behaviors
- **Simple Configuration**: Just four parameters control the entire curve

## Mathematical Design

The zoom curve uses a dual-segment approach with logarithmic interpolation:

### 1. Lower Range (Zoom 0 to Breakpoint)

For zoom levels from 0 to the breakpoint (default: 50), linear interpolation in logarithmic space is used:

```
zoomProgress = zoom / breakpoint
logMinScale = log10(minScale)
logMidScale = log10(midScale)
logScale = logMinScale + (logMidScale - logMinScale) * zoomProgress
scale = 10^logScale
```

Where:
- `minScale` (default: 4.0e-9) is the scale at zoom=0 (years view)
- `midScale` is calculated as the logarithmic midpoint between minScale and maxScale
- `breakpoint` (default: 50) is where the transition to the accelerated curve occurs

### 2. Upper Range (Breakpoint to 100)

For zoom levels from the breakpoint to 100, accelerated interpolation in logarithmic space is used:

```
zoomProgress = (zoom - breakpoint) / (100 - breakpoint)
acceleratedProgress = zoomProgress^upperExponent
logMidScale = log10(midScale)
logMaxScale = log10(maxScale)
logScale = logMidScale + (logMaxScale - logMidScale) * acceleratedProgress
scale = 10^logScale
```

Where:
- `midScale` is calculated as the logarithmic midpoint between minScale and maxScale
- `maxScale` (default: 1.0e-5) is the scale at zoom=100 (seconds view)
- `upperExponent` (default: 2.0) controls the steepness of the acceleration curve

## Approximate Scale Mappings

| Zoom Level | Scale Factor (approx) | Typical View        |
|------------|----------------------|---------------------|
| 0          | 4.0e-9               | Years               |
| 25         | ~3.5e-8              | Months              |
| 50 (Break) | ~6.3e-7              | Days/Hours          |
| 75         | ~7.0e-6              | Minutes             |
| 90         | ~5.0e-6              | Seconds             |
| 100        | 1.0e-5               | Seconds (max zoom)  |

## Preset System

The ZoomCurveCalculator includes several ready-to-use presets:

```typescript
export const ZOOM_PRESETS = {
  DEFAULT: {
    breakpoint: 50,
    minScale: 4.0e-9,    // Years view
    maxScale: 1.0e-5,    // Seconds view
    upperExponent: 2.0   // Moderate acceleration
  },
  GENTLE: {
    breakpoint: 60,
    minScale: 4.0e-9,
    maxScale: 1.0e-5,
    upperExponent: 1.5   // Gentler acceleration
  },
  STEEP: {
    breakpoint: 40,
    minScale: 4.0e-9,
    maxScale: 1.0e-5,
    upperExponent: 2.5   // Steeper acceleration
  },
  EXTREME: {
    breakpoint: 30,
    minScale: 4.0e-9,
    maxScale: 5.0e-6,    // Close to seconds
    upperExponent: 3.0   // Dramatic acceleration
  }
}
```

## Usage in Code

The zoom curve is implemented in `ZoomCurveCalculator.ts` and used in the `useGanttChart` hook:

```typescript
// Create a calculator with a preset
const calculator = new ZoomCurveCalculator('DEFAULT');

// Or with custom configuration
const calculator = new ZoomCurveCalculator({
  breakpoint: 45,
  minScale: 5.0e-9,
  maxScale: 2.0e-5,
  upperExponent: 2.2
});

// Calculate scale for a given zoom level
const scale = calculator.calculateScale(zoomLevel); // 0-100

// Switch to a different preset at runtime
calculator.usePreset('STEEP');
```

## Debugging & Visualization

The zoom curve behavior can be analyzed using the built-in debug utility:

```typescript
// Import in component or use via browser console after calling window.debugGanttChart()
import { debugZoomCurve } from '@/components/gantt-chart-canvas/core';

// Analyze full zoom range
debugZoomCurve();

// Analyze specific range with higher resolution
debugZoomCurve(60, 100, 2);
```

## Customization

The curve can be customized by providing a configuration object to the ZoomCurveCalculator:

```typescript
const customCalculator = new ZoomCurveCalculator({
  // Control the transition point
  breakpoint: 40,     // Lower value = earlier acceleration

  // Control the range (min to max)
  minScale: 5.0e-9,   // Adjust starting scale (zoom=0)
  maxScale: 8.0e-6,   // Adjust maximum scale (zoom=100)
  
  // Control the acceleration curve
  upperExponent: 2.5  // Higher = steeper acceleration curve
});
```

## Advanced Usage

For more advanced scenarios, the calculator can generate data points for analysis:

```typescript
// Generate 100 data points across the zoom range
const dataPoints = calculator.generateCurveData(100);

// Process or visualize the data
dataPoints.forEach(([zoom, scale]) => {
  console.log(`Zoom ${zoom}: Scale ${scale}`);
});
```