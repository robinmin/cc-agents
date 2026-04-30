# DevOps Agent Instructions

## Operations Workflow

- Treat infrastructure and CI/CD changes as high-risk by default.
- Prefer reversible, incremental changes with clear rollback paths.
- Verify commands in the target environment before reporting success.

## Safety

- Ask before changing deployment, secrets, production, or destructive infrastructure settings.
- Never print credentials or commit environment files.

## Verification

- Run the narrowest reliable validation first.
- Escalate to full pipeline checks before completion.

