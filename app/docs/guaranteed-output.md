# "Guaranteed Output" Across Project Types

## Overview

This section examines how Clarity and sPrint handle edge cases and ensure reliable output across different project types and scenarios.

## Clarity

### Approach
Solves edge cases by brute force:
- Open everything
- Load all links
- Print what Revit shows

### Reliability
- Full model context available
- All links loaded and resolved
- Direct access to Revit's rendering engine
- Guaranteed fidelity: what Revit sees is what prints

## sPrint

### Failure Scenarios
sPrint fails when:
- Models lose collaboration state
- Links are present but unresolved
- Published artifacts are incomplete or corrupted
- ACC/B360 publish process has issues

### Limitations
- Dependent on ACC/B360 publish quality
- Cannot detect or resolve link issues
- Cannot verify model state before export
- Limited to what was successfully published

## Parity Status

- ✗ **Detection possible**
- ✗ **Remediation requires Revit runtime**

## Analysis

### Detection Capabilities

sPrint could potentially detect some issues:
- Missing or broken links in published content
- Incomplete sheet data
- Collaboration state problems (if exposed by API)
- Published artifact inconsistencies

### Remediation Limitations

However, **remediation** of these issues requires:
- Opening models in Revit
- Resolving link paths
- Re-establishing collaboration state
- Re-publishing to ACC/B360

These remediation steps are **not possible** without Revit runtime, which sPrint explicitly avoids.

## Conclusion

While sPrint may be able to **detect** some output quality issues, it cannot **remediate** them without Revit. This creates a dependency on the ACC/B360 publish process being reliable and complete, which may not always be the case.

Clarity's "brute force" approach of opening everything in Revit ensures that all links are resolved and all data is available, but this comes at the cost of requiring Revit runtime.

## Related Note

> **We need exact character recognition**
> 
> People are going to start getting pissed about this whole turning every special character into an underscore. I'm with them because I dont like underscores.

This highlights a specific fidelity issue where special characters in sheet names or other metadata are being converted to underscores, which is a problem that needs to be addressed.
