---
name: golang-modules
description: "Go module management: go.mod, go.sum, go.work, dependency management, and versioning."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:project-structures
---

# Go Modules

This reference covers Go module management, dependency handling, and workspace configuration.

## Table of Contents

1. [Module Basics](#module-basics)
2. [go.mod Structure](#gomod-structure)
3. [Dependency Management](#dependency-management)
4. [go.work Workspaces](#gowork-workspaces)
5. [Best Practices](#best-practices)

## Module Basics

### Creating a Module

```bash
# Initialize module
go mod init github.com/user/myproject

# Creates go.mod:
# module github.com/user/myproject
#
# go 1.21
```

### Module Structure

```
myproject/
├── go.mod          # Module definition
├── go.sum          # Checksums of dependencies
├── pkg1/
│   └── file.go     # Package pkg1
└── cmd/
    └── main.go     # Entry point
```

## go.mod Structure

```go
// go.mod
module github.com/user/myproject

go 1.21

require (
    github.com/pkg/errors v0.9.1
    github.com/spf13/cobra v1.8.0
)

require (
    golang.org/x/text v0.14.0 // indirect
)

replace golang.org/x/text => ../text // Local replacement
```

### go.mod Directives

| Directive | Purpose |
|-----------|---------|
| `module` | Module name (used in imports) |
| `go` | Minimum Go version |
| `require` | Direct dependencies |
| `replace` | Replace module with local/other version |

## Dependency Management

### Adding Dependencies

```bash
# Add latest
go get github.com/pkg/errors

# Add specific version
go get github.com/pkg/errors@v0.9.1

# Add latest minor/patch
go get github.com/pkg/errors@v0.9

# Upgrade all
go get ./...
```

### Updating Dependencies

```bash
# Upgrade to latest
go get -u github.com/pkg/errors

# Upgrade all
go get -u ./...

# Tidy (remove unused, add missing)
go mod tidy
```

### Removing Dependencies

```bash
# Remove unused dependencies
go mod tidy
```

### Version Selection

```bash
# List dependencies
go list -m all

# Show specific version
go list -m github.com/pkg/errors

# Show available versions
go list -m -versions github.com/pkg/errors
```

## go.work Workspaces

### When to Use Workspaces

- Developing multiple modules locally
- Working on a monorepo
- Testing changes across multiple modules

### Creating a Workspace

```bash
# Initialize workspace
go work init

# Add modules
go work use ./module1
go work use ./module2
go work use ./shared
```

### go.work Structure

```go
go 1.21

use (
    ./module1
    ./module2
    ./shared/pkg
)

replace (
    github.com/original/pkg => ./local/pkg
    github.com/old/version => github.com/new/version v2.0.0
)
```

### Workspace Workflow

```bash
# 1. Edit code in any module
cd module1
go build ./...

# 2. Changes are visible to other modules
cd ../module2
go build ./... # Uses module1 from workspace

# 3. Sync workspace
go work sync
```

## Best Practices

### 1. Use Semantic Versions

```bash
# Tag releases
git tag v1.0.0
git push origin v1.0.0

# Use pseudo-versions for local development
go get github.com/user/pkg@v0.0.0-20230101-checkpoint
```

### 2. Keep go.mod Clean

```bash
# Regular tidying
go mod tidy

# After removing code
go mod tidy
```

### 3. Vendor Dependencies (Optional)

```bash
# Create vendor directory
go mod vendor

# Build using vendor
go build -mod=vendor ./...
```

### 4. Use replace Sparingly

```go
// Use for local development
replace golang.org/x/text => ../text

// Use for fixing bugs in dependencies
replace github.com/buggy/pkg => github.com/fixed/pkg v1.2.3
```

### 5. Minimal Dependencies

- Use stdlib first
- Choose well-maintained packages
- Avoid dependency duplication

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `go mod init` | Initialize new module |
| `go mod tidy` | Add missing, remove unused |
| `go get url@version` | Add/update dependency |
| `go mod download` | Download dependencies |
| `go list -m all` | List all dependencies |
| `go work init` | Initialize workspace |
| `go work use ./path` | Add module to workspace |
| `go mod vendor` | Create vendor directory |

## Further Reading

- [Go Modules Reference](https://go.dev/ref/mod)
- [Go Modules Tutorial](https://go.dev/blog/using-go-modules)
- [Go Workspaces Tutorial](https://go.dev/blog/get-started-with-workspaces)
