---
name: golang-project-structures
description: "Go project layout patterns: cmd/pkg/internal directories, standard layouts, and workspace configuration."
see_also:
  - rd3:pl-golang
  - rd3:pl-golang:modules
  - rd3:pl-golang:best-practices
---

# Go Project Structures

This reference covers common Go project layouts and when to use each structure.

## Table of Contents

1. [Simple CLI Tool](#simple-cli-tool)
2. [Library Package](#library-package)
3. [Standard Application](#standard-application)
4. [Microservices/Monorepo](#microservicesmonorepo)
5. [Go Workspace](#go-workspace)
6. [Directory Explanations](#directory-explanations)

## Simple CLI Tool

### Structure

```
mycli/
├── go.mod
├── go.sum
├── main.go
├── README.md
└── LICENSE
```

### When to Use

- Single-purpose tools
- Simple utilities
- Learning projects
- Scripts that need compilation

## Library Package

### Structure

```
mylib/
├── go.mod
├── go.sum
├── README.md
├── LICENSE
├── CHANGELOG.md
├── mylib.go              # Public API
├── mylib_test.go
└── internal/             # Private implementation
    └── impl.go
```

### When to Use

- Reusable code libraries
- Packages for distribution
- Shared utilities
- API clients

## Standard Application

### Structure

```
myapp/
├── go.mod
├── go.sum
├── README.md
├── .env.example
├── Makefile
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── cmd/
│   ├── server/
│   │   └── main.go
│   ├── worker/
│   │   └── main.go
│   └── migrate/
│       └── main.go
├── internal/
│   ├── config/
│   ├── domain/
│   ├── repository/
│   ├── service/
│   └── handler/
├── pkg/
│   ├── api/
│   │   ├── middleware.go
│   │   └── response.go
│   └── logger/
│       └── logger.go
├── api/
│   ├── openapi/
│   └── graphql/
├── configs/
├── scripts/
├── test/
└── docs/
```

### Directory Explanations

| Directory | Purpose |
|-----------|---------|
| `cmd/` | Entry points (main functions) |
| `internal/` | Private application code (cannot be imported) |
| `pkg/` | Public library code (can be imported externally) |
| `api/` | API definitions (OpenAPI, protobuf) |
| `configs/` | Configuration files |
| `scripts/` | Build, install, analysis scripts |
| `test/` | Extra test data and fixtures |
| `docs/` | Design documents |

### When to Use

- Web applications
- Microservices
- REST APIs
- Production services

## Microservices/Monorepo

### Structure

```
company-monorepo/
├── go.work
├── services/
│   ├── user-service/
│   │   ├── go.mod
│   │   ├── cmd/
│   │   ├── internal/
│   │   └── api/
│   ├── order-service/
│   └── product-service/
├── shared/
│   ├── pkg/
│   │   ├── auth/
│   │   ├── logging/
│   │   └── middleware/
│   └── proto/
│       └── common/
├── deploy/
└── docs/
```

### go.work

```go
// go.work
go 1.21

use (
    ./services/user-service
    ./services/order-service
    ./services/product-service
    ./shared/pkg
)
```

### When to Use

- Multiple related services
- Shared libraries
- Team collaboration
- Microservice architecture

## Go Workspace

### When to Use Workspaces

- Developing multiple modules locally
- Splitting large projects into modules
- Replacing module with local version
- Monorepo development

### Creating Workspace

```bash
# Initialize workspace
go work init

# Add modules
go work use ./module1
go work use ./module2

# Sync workspace
go work sync
```

## Directory Explanations

### cmd/

```
cmd/
├── app1/
│   └── main.go
├── app2/
│   └── main.go
└── app3/
    └── main.go
```

- **Purpose**: Entry points for applications
- **One directory per executable**
- **Keep main.go minimal** - delegate to internal packages

### internal/

```
internal/
├── app/
│   └── app.go
├── domain/
│   ├── user.go
│   └── product.go
└── repository/
    └── database.go
```

- **Purpose**: Private application code
- **Cannot be imported by other modules**
- **Place implementation details here**

### pkg/

```
pkg/
├── api/
│   └── client.go
├── logger/
│   └── logger.go
└── util/
    └── strings.go
```

- **Purpose**: Public library code
- **Can be imported by external projects**
- **Stable APIs intended for reuse**

## Choosing a Structure

| Project Type | Recommended Structure |
|-------------|---------------------|
| **Simple CLI** | Single main.go |
| **Library** | Flat with internal/ |
| **Web App** | Standard application layout |
| **Microservices** | Monorepo with shared/ |
| **Plugin System** | Workspace with multiple modules |

## Best Practices

1. **Keep main.go minimal** - Delegate to internal packages
2. **Use internal/ for private code** - Enforces boundaries
3. **Separate concerns** - Different packages for different layers
4. **Follow Go conventions** - Use standard layouts
5. **Document structure** - README with directory explanation
6. **Keep dependencies minimal** - Avoid unnecessary packages
7. **Version control** - Tag releases for libraries
8. **Use workspaces** - For multi-module development

## Further Reading

- [Standard Go Project Layout](https://github.com/golang-standards/project-layout)
- [How to Write Go Code](https://go.dev/doc/code)
- [Organizing Go Code](https://go.dev/doc/effective_go#layout)
- [Go Workspace Tutorial](https://go.dev/doc/tutorial/workspaces)
