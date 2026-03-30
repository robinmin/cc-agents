---
name: token-saver-commands
description: "Complete command reference for RTK (Rust Token Killer) token optimization proxy"
see_also:
  - rd3:token-saver
---

# RTK Command Reference

Complete reference for all RTK-supported commands with examples and savings estimates.

## Files

```bash
rtk ls .                        # Token-optimized directory tree
rtk tree .                      # Compact tree view
rtk read file.rs                # Smart file reading
rtk read file.rs -l aggressive  # Signatures only (strips bodies)
rtk read file.rs -n             # With line numbers
rtk read file.rs --max-lines 50 # First 50 lines only
rtk read file.rs --tail-lines 20 # Last 20 lines only
rtk smart file.rs               # 2-line heuristic code summary
rtk find "*.rs" .               # Compact find results
rtk grep "pattern" .            # Grouped search results
rtk diff file1 file2            # Condensed diff
rtk json config.json            # Structure without values
```

## Git

```bash
rtk git status                  # Compact status
rtk git log -n 10               # One-line commits
rtk git diff                    # Condensed diff
rtk git add .                   # -> "ok"
rtk git commit -m "msg"         # -> "ok abc1234"
rtk git push                    # -> "ok main"
rtk git pull                    # -> "ok 3 files +10 -2"
rtk git branch                  # Compact branch list
rtk git fetch                   # Compact fetch summary
rtk git stash                   # Compact stash info
rtk git show                    # Compact show
```

## GitHub CLI

```bash
rtk gh pr list                  # Compact PR listing
rtk gh pr view 42               # PR details + checks
rtk gh issue list               # Compact issue listing
rtk gh run list                 # Workflow run status
```

## Test Runners

```bash
rtk test cargo test             # Show failures only (-90%)
rtk cargo test                  # Alternative form (-90%)
rtk vitest run                  # Vitest compact (-99%)
rtk playwright test             # E2E results, failures only (-94%)
rtk pytest                      # Python tests (-90%)
rtk go test                     # Go tests, NDJSON (-90%)
rtk rake test                   # Ruby minitest (-90%)
rtk rspec                       # RSpec tests (JSON, -60%+)
```

## Build & Lint

```bash
rtk lint                        # ESLint/Biome grouped by rule/file (-84%)
rtk tsc                         # TypeScript errors grouped by file/code (-83%)
rtk next build                  # Next.js build, route/bundle metrics (-87%)
rtk prettier --check .          # Files needing formatting (-70%)
rtk cargo build                 # Cargo build errors only (-80%)
rtk cargo clippy                # Clippy warnings only (-80%)
rtk cargo check                 # Check errors only (-80%)
rtk ruff check                  # Python linting (-80%+)
rtk ruff format                 # Python formatting (-80%+)
rtk golangci-lint run           # Go linting (-85%)
rtk rubocop                     # Ruby linting (-60%+)
rtk mypy                        # Python type checking (-80%)
```

## Package Managers

```bash
rtk pnpm list                   # Compact dependency tree (-70-90%)
rtk pip list                    # Python packages (auto-detect uv) (-70-85%)
rtk pip outdated                # Outdated packages
rtk bundle install              # Ruby gems (strip Using lines) (-90%)
```

## Containers

```bash
rtk docker ps                   # Compact container list (-80%)
rtk docker images               # Compact image list (-80%)
rtk docker logs <container>     # Deduplicated logs
rtk docker compose ps           # Compose services
rtk kubectl pods                # Compact pod list (-80%)
rtk kubectl logs <pod>          # Deduplicated logs
rtk kubectl services            # Compact service list
```

## Data & Utilities

```bash
rtk deps                        # Dependencies summary
rtk env -f AWS                  # Filtered env vars
rtk log app.log                 # Deduplicated logs
rtk curl <url>                  # Auto-detect JSON + schema
rtk wget <url>                  # Download, strip progress bars
rtk summary <command>           # Heuristic summary
rtk proxy <command>             # Raw passthrough + tracking
```

## Error Filtering

```bash
rtk err npm run build           # Errors/warnings only
```

## Commands Auto-Rewritten by Hook

| Raw Command | Rewritten To |
|-------------|-------------|
| `git status/diff/log/add/commit/push/pull` | `rtk git ...` |
| `gh pr/issue/run` | `rtk gh ...` |
| `cargo test/build/clippy/check` | `rtk cargo ...` |
| `cat/head/tail <file>` | `rtk read <file>` |
| `rg/grep <pattern>` | `rtk grep <pattern>` |
| `ls` | `rtk ls` |
| `tree` | `rtk tree` |
| `find` | `rtk find` |
| `vitest/jest` | `rtk vitest run` |
| `tsc` | `rtk tsc` |
| `eslint/biome` | `rtk lint` |
| `prettier` | `rtk prettier` |
| `playwright` | `rtk playwright` |
| `prisma` | `rtk prisma` |
| `pytest` | `rtk pytest` |
| `pip list/install` | `rtk pip ...` |
| `go test/build/vet` | `rtk go ...` |
| `golangci-lint` | `rtk golangci-lint` |
| `rake test` / `rails test` | `rtk rake test` |
| `rspec` / `bundle exec rspec` | `rtk rspec` |
| `rubocop` / `bundle exec rubocop` | `rtk rubocop` |
| `bundle install/update` | `rtk bundle ...` |
| `docker ps/images/logs` | `rtk docker ...` |
| `kubectl get/logs` | `rtk kubectl ...` |
| `curl` | `rtk curl` |
| `wget` | `rtk wget` |
| `pnpm list/outdated` | `rtk pnpm ...` |

Commands already using `rtk`, heredocs (`<<`), and unrecognized commands pass through unchanged.
