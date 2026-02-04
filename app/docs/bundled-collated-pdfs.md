# Bundled / Collated PDFs

## Overview

This section compares how Clarity and sPrint handle bundling and collating multiple PDFs into a single output.

## Clarity

### Capabilities
- Native PDF drivers
- Revit-controlled ordering
- Single output artifact
- Links in PDF
- Regex support for filtering sheets (e.g., All A Sheets = A Sheets Only `[A]\d\d-`)

### Example
- Regex pattern: `[A]\d\d-` filters to A sheets only
- Reference: Jordan's regex cheat sheet = DP Files > Technologies > Clarity > Regex Expression Cheat Sheet

## sPrint

### Current State
- Individual PDFs per sheet
- Bundling requires post-processing

## What Parity Requires

To achieve parity with Clarity's bundled PDF capabilities, sPrint would need:

1. **Server-side PDF merging**
   - Combine multiple PDFs into a single file
   - Handle file size and performance considerations

2. **Ordering logic**
   - Sheet number ordering
   - Set-based ordering
   - Index-based ordering
   - Custom ordering rules

3. **Handling mixed page sizes**
   - Support for different sheet sizes within a single bundle
   - Proper page orientation handling

## Parity Status

- ✔ **Technically achievable**

## Implementation Notes

The bundling functionality is feasible to implement but requires infrastructure changes to support server-side PDF manipulation and merging operations. The ordering logic can leverage existing sheet metadata, and regex filtering (similar to Clarity) could be added for sheet selection.
