---
name: spring-review
description: Review Spring Boot changes for transaction, validation, and API boundary mistakes.
license: Apache-2.0
compatibility: opencode
---

# Spring Review

Review changed Spring Boot code with a focus on behavior that compiles but fails in production.

## Checklist

1. Confirm transaction boundaries sit on public service methods.
2. Verify request validation occurs at the HTTP boundary.
3. Check JPA queries for accidental N+1 access.
4. Run the project's configured test command before reporting success.

## Output

Report findings by severity and cite the exact file. Do not modify code unless the user asks.
