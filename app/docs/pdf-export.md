# PDF Export (Sheets → PDFs)

## Overview

This section compares how Clarity and sPrint handle PDF export from Revit sheets.

## Clarity

### Process
- Opens Revit
- Executes native print/export
- Supports PDF, DWG, IFC, etc.
- Fidelity guaranteed by Revit itself
- Has control over DPI (sPrint setting for this is set)

### Key Characteristics
- Direct access to Revit's native printing capabilities
- Full model context available
- Can print anything Revit can see

## sPrint

### Process
- Consumes **already-published** sheet representations from ACC/B360
- No Revit runtime required
- PDFs are derivative of publish, not print

### Key Characteristics
- Works with published artifacts only
- No direct Revit access
- Limited to what was published to ACC/B360

## Key Takeaway

- **Clarity prints from models.**
- **sPrint exports from published artifacts.**

## Parity Status

- ✔ **Functional parity for published-sheet PDFs only**
- ✗ **Not parity for "print anything Revit can see"**

## Implications

sPrint can achieve functional parity for the specific use case of exporting already-published sheets to PDF, but cannot match Clarity's ability to print anything that Revit can display, as it lacks direct access to the Revit runtime and model context.
