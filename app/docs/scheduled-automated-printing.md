# Scheduled / Automated Printing

## Overview

This section compares the automation and scheduling capabilities of Clarity and sPrint.

## Clarity

### Architecture
- Central orchestration layer
- Time-based scheduling
- Event-based scheduling
- Persistent credentials
- Retry mechanisms
- Logging and dashboards

### Features
- Automated execution without user intervention
- Scheduled runs (daily, weekly, etc.)
- Event-triggered prints (e.g., on model update)
- Credential management for unattended operation
- Error recovery and retry logic
- Comprehensive logging and monitoring

## sPrint

### Current State
- User-initiated only
- Browser-session bound
- No orchestration layer

### Limitations
- Requires user to manually trigger prints
- Tied to active browser session
- No background processing
- No scheduling capabilities

## What Parity Requires

To achieve parity with Clarity's scheduling capabilities, sPrint would need:

1. **A backend service**
   - Persistent service running independently
   - Job queue management
   - Task execution engine

2. **Job definitions stored outside the browser**
   - Database or configuration storage
   - Job templates and configurations
   - Version control for job definitions

3. **Token lifecycle management**
   - Secure credential storage
   - Token refresh mechanisms
   - Authentication for scheduled jobs

4. **Error recovery and reporting**
   - Retry logic for failed jobs
   - Error logging and alerting
   - Status reporting and dashboards

## Parity Status

- ▲ **Technically possible**
- ✗ **Architecturally transformative for sPrint**

## Implementation Considerations

While technically feasible, implementing scheduled printing would require significant architectural changes to sPrint:

- Moving from a client-side application to a client-server architecture
- Adding backend infrastructure for job management
- Implementing authentication and authorization for automated jobs
- Building monitoring and logging systems
- High development and operational cost

This represents a fundamental shift in sPrint's architecture from a user-driven tool to an automated service platform.
