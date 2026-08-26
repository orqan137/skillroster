---
name: docker-debug
description: Diagnose Docker build and runtime failures without destructive cleanup.
license: Apache-2.0
compatibility: opencode
---

# Docker Debug

Collect the failing command, image metadata, container logs, mounts, and network configuration. Prefer
read-only diagnostics. Never delete volumes or images unless the user explicitly approves the targets.
