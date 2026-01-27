# Go Modules and Packages

This reference covers Go modules (go.mod), workspaces (go.work), package management, and dependency best practices.

## Table of Contents

1. [Module Basics](#module-basics)
2. [go.mod File](#gomod-file)
3. [Dependencies](#dependencies)
4. [go.work (Workspaces)](#gowork-workspaces)
5. [Package Organization](#package-organization)
6. [Versioning](#versioning)
7. [Best Practices](#best-practices)

## Module Basics

### Initializing a Module

```bash
# Initialize new module
go mod init github.com/user/project

# Initialize with specific path
go mod init example.com/myproject

# Initialize in existing directory
cd myproject
go mod init github.com/user/myproject
```

### Module Structure

```
myproject/
├── go.mod              # Module definition
├── go.sum              # Dependency checksums
├── main.go             # Main package
├── pkg/                # Internal packages
│   └── mypackage/
│       ├── mypackage.go
│       └── mypackage_test.go
└── cmd/                # Command entry points
    └── app/
        └── main.go
```

## go.mod File

### Basic go.mod

```go
module github.com/user/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4
)
```

### go.mod Directives

```go
module github.com/user/myproject  // Module name

go 1.21  // Minimum Go version

require (
    // Direct dependencies
    github.com/pkg/errors v0.9.1
)

// Indirect dependency (mentioned but not directly imported)
require github.com/other/lib v1.2.3 // indirect

// Exclude specific versions
exclude github.com/bad/lib v1.0.0

// Replace with different version or local path
replace github.com/old/lib => github.com/new/lib v2.0.0
replace github.com/local/lib => ../local/lib

// Retract (for module maintainers)
retract v1.0.1  // Bad release, don't use
```

## Dependencies

### Adding Dependencies

```bash
# Add package (automatically updates go.mod and go.sum)
go get github.com/pkg/errors

# Add specific version
go get github.com/pkg/errors@v0.9.1

# Add latest version
go get github.com/pkg/errors@latest

# Add with commit hash
go get github.com/pkg/errors@abc123def456
```

### Updating Dependencies

```bash
# Update all dependencies to latest compatible versions
go get -u ./...

# Update specific package
go get -u github.com/pkg/errors

# Update to latest major version (if available)
go get github.com/pkg/errors@v1

# Tidy (add missing, remove unused)
go mod tidy

# Verify dependencies
go mod verify
```

### Dependency Commands

```bash
# List all dependencies
go list -m all

# List direct dependencies
go list -m -f '{{if not .Indirect}}{{.Path}}{{end}}' all

# Download dependencies to local cache
go mod download

# Copy dependencies to vendor directory
go mod vendor

# Graph dependency tree
go mod graph

# Why a dependency was included
go mod why github.com/pkg/errors
```

### Vendoring

```bash
# Enable vendor mode
go mod vendor

# Build using vendor
go build -mod=vendor

# Force using vendor (GOFLAGS=-mod=vendor)
export GOFLAGS=-mod=vendor
go build
```

## go.work (Workspaces)

Go 1.18+ introduced workspaces for multi-module development:

### Creating a Workspace

```bash
# Initialize workspace
go work init

# Add modules to workspace
go work use ./module1
go work use ./module2
```

### go.work File

```go
go 1.21

use (
    ./module1
    ./module2
    ./module3
)
```

### Workspace Structure

```
workspace/
├── go.work
├── module1/
│   ├── go.mod
│   └── main.go
├── module2/
│   ├── go.mod
│   └── lib.go
└── module3/
    ├── go.mod
    └── util.go
```

### Workspace Commands

```bash
# Sync workspace
go work sync

# List workspace modules
go work use

# Remove module from workspace
go work edit -dropuse ./module3
```

### When to Use Workspaces

**Use workspaces for:**
- Multi-module repositories (monorepos)
- Local development of multiple modules
- Testing local changes without pushing
- Large projects split into multiple modules

## Package Organization

### Standard Layouts

```
# Simple library
mylib/
├── go.mod
└── mylib.go

# Application
cmd/
├── app1/
│   └── main.go
├── app2/
│   └── main.go
└── app3/
    └── main.go

# Standard project layout
project/
├── cmd/              # Entry points
│   └── server/
│       └── main.go
├── internal/         # Private code
│   ├── app/
│   └── database/
├── pkg/              # Public libraries
│   └── api/
├── api/              # API definitions
│   ├── openapi/
│   └── proto/
├── web/              # Web assets
│   ├── static/
│   └── templates/
├── configs/          # Config files
├── scripts/          # Build scripts
├── docs/             # Documentation
├── test/             # Additional test data
├── go.mod
└── README.md
```

### Internal Packages

Go 1.4+ introduced `internal` packages that cannot be imported by other modules:

```
github.com/user/project/
├── internal/
│   ├── auth/         # Can only be imported by code in this module
│   └── db/
└── pkg/
    └── api/          # Can be imported by anyone
```

```go
// Can be imported by:
// - github.com/user/project/cmd/server
// - github.com/user/project/pkg/api

// CANNOT be imported by:
// - github.com/other/project
```

### Package Naming

```go
// Package name should match directory name
package user  // In user/ directory

// Short, lowercase, single word preferred
package httpserver  // Good
package HTTPServer  // Bad
package main        // Only for executable entry points

// Avoid underscores in package names
package user_auth   // Avoid
package userauth    // Better
package auth        // Best
```

### Import Paths

```go
// Standard library
import "fmt"
import "net/http"

// Third-party packages
import "github.com/gin-gonic/gin"

// Internal packages (same module)
import "github.com/user/project/internal/auth"
import "github.com/user/project/pkg/api"

// Local packages (relative imports NOT recommended)
// Don't use: import "./internal/auth"
```

## Versioning

### Semantic Import Versioning

Go uses semantic import versioning - the major version is in the import path:

```go
// v0 and v1 - no version in path
import "github.com/user/project"

// v2+ - version in path
import "github.com/user/project/v2"
import "github.com/user/project/v3"
```

### Module Declaration with Major Version

```go
// For v0 or v1
module github.com/user/project

// For v2+
module github.com/user/project/v2
```

### Directory Structure for Multiple Versions

```
project/
├── v1/
│   ├── go.mod        // module github.com/user/project
│   └── lib.go
└── v2/
    ├── go.mod        // module github.com/user/project/v2
    └── lib.go
```

### Tagging Releases

```bash
# Tag a release
git tag v1.0.0
git push origin v1.0.0

# Tag a pre-release
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1
```

### Version Syntax in go.mod

```go
// Specific version
require github.com/pkg/errors v0.9.1

// Minimum version (>=)
require github.com/pkg/errors v0.9.0

# Pseudo-versions for commits without tags
require github.com/pkg/errors v0.0.0-20200101000000-abc123def456
```

## Best Practices

### Module Best Practices

1. **Use semantic versioning** - Follow semver (major.minor.patch)
2. **Tag your releases** - Use git tags for versions
3. **Keep go.mod clean** - Run `go mod tidy` regularly
4. **Use minimal dependencies** - Fewer deps = fewer issues
5. **Update dependencies regularly** - Security and bug fixes
6. **Vendor for critical builds** - Reproducible builds
7. **Use internal packages** - Hide implementation details
8. **Follow standard layouts** - Use project-standard conventions

### Dependency Management Best Practices

```bash
# Before committing
go mod tidy        # Clean up
go mod verify      # Verify checksums

# Before releases
go test ./...      # Run all tests
go mod vendor      # Vendor dependencies (optional)

# Regular maintenance
go get -u ./...    # Update dependencies
go mod tidy        # Clean up
```

### Module Publishing Checklist

- [ ] Tagged release version (e.g., v1.0.0)
- [ ] go.mod has correct module path
- [ ] go.mod has minimum Go version
- [ ] Dependencies are tidy (`go mod tidy`)
- [ ] README.md with usage examples
- [ ] LICENSE file
- [ ] No breaking changes in patch/minor versions
- [ ] Version in import path for v2+

## Common Pitfalls

### Import Path Mismatch

```go
// WRONG: go.mod path doesn't match import
// go.mod: module github.com/user/project
// import: "github.com/user/myservice/project"

// RIGHT: Keep them consistent
// go.mod: module github.com/user/project
// import: "github.com/user/project"
```

### Missing go.sum in VCS

```bash
# Always commit go.sum!
# It contains cryptographic hashes for reproducible builds

git add go.mod go.sum
git commit -m "Add dependency"
```

### Forgetting to Tidy

```bash
# Before committing, always run
go mod tidy

# This removes unused dependencies and adds missing ones
```

### Using Relative Imports

```go
// WRONG: Relative imports
import "./internal/auth"
import "../pkg/api"

// RIGHT: Full import paths
import "github.com/user/project/internal/auth"
import "github.com/user/project/pkg/api"
```

## Further Reading

- [Go Modules Reference](https://go.dev/ref/mod)
- [Go by Example: Modules](https://gobyexample.com/modules)
- [How to Write Go Code](https://go.dev/doc/code)
- [Go Modules Wiki](https://github.com/golang/go/wiki/Modules)
- [Standard Go Project Layout](https://github.com/golang-standards/project-layout)
