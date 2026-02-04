# Clarity Parity

> "The software worked well, we took a tedious task off our employees' plates, and we spent a lot of time getting to know IMAGINIT," said Matt Petermann. "It was a very successful pilot."

## Introduction

Clarity provides five distinct things (for drawings):

1. Sheet-driven PDF generation
2. Bundled / collated PDFs
3. Scheduled / repeatable execution
4. Print configuration control
5. Guaranteed fidelity (what Revit sees is what prints)

## Parity Table

| Capability | Clarity | sPrint Today | Parity Feasible? |
|------------|---------|--------------|------------------|
| Export published sheets to PDF | ✔ | ✔ | Done |
| Bundled PDFs | ✔ | ✗ | ▲ With infra |
| Scheduled Prints | ✔ | ✗ | ▲ High cost |
| Print Settings Control | ✔ (Revit-native) | ✗ | ✗ No |
| Fidelity | ✔ | ▲ | ✗ No |
| Works w/out Revit Runtime | ✗ | ✔ | ✗ By definition |

### Legend

- ✔ = Supported / Achievable
- ✗ = Not supported / Not achievable
- ▲ = Partial support / Technically possible but with limitations

## Key Differences

**Clarity:**
- Prints from models
- Requires Revit runtime
- Native Revit print/export capabilities
- Full control over print settings

**sPrint:**
- Exports from published artifacts (ACC/B360)
- No Revit runtime required
- Works with already-published sheet representations
- Limited to what ACC/B360 exposes post-publish

## Related Documentation

- [PDF Export (Sheets → PDFs)](./pdf-export.md)
- [Bundled / Collated PDFs](./bundled-collated-pdfs.md)
- [Scheduled / Automated Printing](./scheduled-automated-printing.md)
- [Print Configuration & Fidelity](./print-config-fidelity.md)
- [Guaranteed Output Across Project Types](./guaranteed-output.md)
