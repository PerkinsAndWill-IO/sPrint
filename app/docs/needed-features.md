# Needed Features

## Overview

This document tracks feature requests and improvements needed for sPrint based on the Clarity parity analysis and user feedback.

## Character Recognition

### Issue
Special characters in sheet names and metadata are being converted to underscores.

### User Feedback
> "We need exact character recognition. People are going to start getting pissed about this whole turning every special character into an underscore. I'm with them because I dont like underscores."

### Requirements
- Preserve special characters exactly as they appear in source data
- No automatic conversion to underscores
- Exact character matching and recognition
- Support for all Unicode characters used in architectural/engineering contexts

## Bundled PDFs

### Current Gap
- Individual PDFs per sheet only
- No native bundling capability

### Needed Features
- Server-side PDF merging
- Sheet ordering logic (by sheet number, set, index)
- Mixed page size support
- PDF linking/navigation within bundles
- Regex-based sheet filtering (similar to Clarity's `[A]\d\d-` pattern)

## Scheduled Printing

### Current Gap
- User-initiated only
- Browser-session bound

### Needed Features
- Backend orchestration service
- Time-based scheduling
- Event-based triggers
- Persistent job definitions
- Token lifecycle management
- Error recovery and retry logic
- Logging and monitoring dashboards

## Print Configuration

### Current Gap
- No access to print settings
- Limited to ACC/B360 published content

### Needed Features
- View template control (if exposed by API)
- Link visibility settings (if available)
- Raster/vector selection (if supported)
- DPI control (if configurable)
- Note: Many of these may be blocked by platform limitations

## Fidelity Improvements

### Current Gap
- Partial fidelity compared to Revit-native output
- Dependent on ACC/B360 publish quality

### Needed Features
- Better detection of collaboration state issues
- Validation of published content completeness
- Warning system for unresolved links
- Quality checks before PDF generation
- Note: Full remediation may require Revit runtime

## Documentation

### Needed
- Regex expression cheat sheet (reference: DP Files > Technologies > Clarity > Regex Expression Cheat Sheet)
- User guides for new features
- Troubleshooting documentation
- API documentation updates

## Priority Notes

- **High Priority**: Character recognition fix (user frustration)
- **Medium Priority**: Bundled PDFs (technically feasible)
- **Low Priority**: Scheduled printing (architecturally transformative)
- **Blocked**: Print configuration control (platform limitations)
