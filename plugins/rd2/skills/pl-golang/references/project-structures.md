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

### Example

```go
// main.go
package main

import (
    "flag"
    "fmt"
    "os"
)

func main() {
    name := flag.String("name", "World", "name to greet")
    flag.Parse()

    fmt.Printf("Hello, %s!\n", *name)
}
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

### Example

```go
// mylib.go
package mylib

// Public function (exported)
func Process(input string) string {
    return processInternal(input)
}

// Private function (unexported)
func processInternal(input string) string {
    // Implementation details
}
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
│   │   └── main.go          # Server entry point
│   ├── worker/
│   │   └── main.go          # Worker entry point
│   └── migrate/
│       └── main.go          # Migration tool
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── domain/
│   │   ├── user.go
│   │   └── product.go
│   ├── repository/
│   │   ├── user.go
│   │   └── product.go
│   ├── service/
│   │   ├── user.go
│   │   └── product.go
│   └── handler/
│       ├── user.go
│       └── product.go
├── pkg/
│   ├── api/
│   │   ├── middleware.go
│   │   └── response.go
│   └── logger/
│       └── logger.go
├── api/
│   ├── openapi/
│   │   └── spec.yaml
│   └── graphql/
│       └── schema.graphql
├── configs/
│   ├── config.yaml
│   └── config.prod.yaml
├── scripts/
│   ├── migrate.sh
│   └── test.sh
├── test/
│   ├── testdata/
│   └── fixtures/
├── docs/
│   └── api.md
└── web/
    ├── static/
    └── templates/
```

### Directory Explanations

| Directory | Purpose |
|-----------|---------|
| `cmd/` | Entry points (main functions) |
| `internal/` | Private application code |
| `pkg/` | Public library code |
| `api/` | API definitions (OpenAPI, protobuf) |
| `configs/` | Configuration files |
| `scripts/` | Build, install, analysis scripts |
| `test/` | Extra test data and fixtures |
| `docs/` | Design documents |
| `web/` | Web application assets |

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
│   │   ├── go.mod
│   │   ├── cmd/
│   │   ├── internal/
│   │   └── api/
│   └── product-service/
│       ├── go.mod
│       ├── cmd/
│       ├── internal/
│       └── api/
├── shared/
│   ├── pkg/
│   │   ├── auth/
│   │   ├── logging/
│   │   └── middleware/
│   └── proto/
│       └── common/
├── deploy/
│   ├── docker/
│   └── kubernetes/
└── docs/
    └── architecture.md
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

### api/

```
api/
├── openapi/
│   ├── user.yaml
│   └── product.yaml
├── proto/
│   ├── user.proto
│   └── product.proto
└── graphql/
    └── schema.graphql
```

- **Purpose**: API definitions and contracts
- **OpenAPI/Swagger specifications**
- **Protocol Buffer definitions**
- **GraphQL schemas**

### web/

```
web/
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── templates/
    ├── index.html
    └── layout.html
```

- **Purpose**: Web application assets
- **Static files**
- **HTML templates**

### configs/

```
configs/
├── config.yaml
├── config.dev.yaml
├── config.prod.yaml
└── config.test.yaml
```

- **Purpose**: Configuration files
- **Different configs for environments**
- **Should be git-ignored if sensitive**

### scripts/

```
scripts/
├── build.sh
├── test.sh
├── migrate.sh
└── deploy.sh
```

- **Purpose**: Build and deployment scripts
- **Automation scripts**
- **Development utilities**

### test/

```
test/
├── testdata/
│   ├── input.json
│   └── expected.json
└── fixtures/
    └── sample.db
```

- **Purpose**: Additional test data
- **Test fixtures**
- **Golden files**

## Example Makefile

```makefile
# Makefile for Go project

.PHONY: build test clean run lint

# Variables
APP_NAME=myapp
BUILD_DIR=build
CMD_DIR=cmd/server

# Build
build:
    @echo "Building $(APP_NAME)..."
    @mkdir -p $(BUILD_DIR)
    @go build -o $(BUILD_DIR)/$(APP_NAME) ./$(CMD_DIR)

# Test
test:
    @echo "Running tests..."
    @go test -v -race -cover ./...

# Run
run:
    @echo "Running $(APP_NAME)..."
    @go run ./$(CMD_DIR)

# Lint
lint:
    @echo "Linting..."
    @golangci-lint run

# Clean
clean:
    @echo "Cleaning..."
    @rm -rf $(BUILD_DIR)

# Docker
docker-build:
    @docker build -t $(APP_NAME) .

docker-run:
    @docker run -p 8080:8080 $(APP_NAME)
```

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
