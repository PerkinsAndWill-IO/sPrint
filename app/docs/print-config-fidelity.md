# Print Configuration & Fidelity

## Overview

This section compares print configuration control and output fidelity between Clarity and sPrint.

## Clarity

### Dependencies
- Explicitly depends on:
  - Revit automation
  - PDF drivers
  - Full model load

### Supported Capabilities
- View templates
- Link visibility
- Raster/vector choice
- Halftones
- Overrides
- DPI control
- Full Revit print settings access

### Limitations
- These capabilities only exist where Revit runs
- Cloud version limits tasks due to Autodesk Automation constraints

## sPrint

### Current State
- Has no access to print settings
- Receives only what ACC/B360 exposes post-publish
- Cannot modify print configuration
- Limited to published artifact properties

### Constraints
- No control over view templates
- Cannot adjust link visibility
- Cannot choose raster vs vector
- No halftone control
- No override capabilities

## Parity Status

- ✗ **Not achievable without opening Revit**
- ✗ **Blocked by platform, not effort**

## Technical Analysis

The fundamental difference is architectural:

- **Clarity** operates at the Revit level, with direct access to all print settings and model data
- **sPrint** operates at the ACC/B360 API level, which only exposes already-rendered published content

To achieve parity, sPrint would need:
1. Revit runtime access (contradicts sPrint's core value proposition)
2. Direct model access (not available through ACC/B360 API)
3. Print settings API (not exposed by Autodesk)

## Conclusion

Print configuration control and full fidelity are **not achievable** for sPrint without fundamentally changing its architecture to require Revit runtime, which would eliminate its key advantage of working without Revit installed.

This limitation is **blocked by platform constraints**, not by lack of development effort. The ACC/B360 API simply does not expose the necessary controls that Revit's native printing system provides.
