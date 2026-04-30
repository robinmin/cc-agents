# Development Agent Instructions

## Project Orientation

- Read the repository instructions before editing.
- Prefer existing architecture, helpers, and test patterns.
- Keep changes scoped to the requested behavior.

## Coding Standards

- Use TypeScript for new scripts.
- Prefer explicit data models over ad hoc string manipulation.
- Avoid `console.*` in scripts; use the shared logger.

## Safety

- Ask before destructive operations such as force-push, hard reset, or broad deletion.
- Never commit secrets or environment files.
- Treat generated platform support with source confidence metadata.

## Verification

- Run focused tests for changed behavior.
- Run `bun run check` before completion when feasible.

