# Backend Patterns with TypeScript

## Overview

TypeScript on the backend (Node.js) provides excellent type safety for APIs, services, and databases. This reference covers Express, NestJS, and server-side patterns.

## Express.js Patterns

### Typed Request/Response

```typescript
import { Request, Response, NextFunction } from 'express';

// Extend Express Request
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

// Typed Route Handler
type AsyncHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

const asyncHandler = (fn: AsyncHandler) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await userService.findById(userId);
  res.json(user);
}));
```

### Route Organization

```typescript
// routes/users.ts
import { Router } from 'express';

const router = Router();

// Typed route handlers
interface CreateUserRequest {
  name: string;
  email: string;
}

router.post<{}, {}, User, CreateUserRequest>(
  '/users',
  async (req, res) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  }
);

router.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

export default router;
```

### Middleware Typing

```typescript
// Validation Middleware
interface ValidationSchema {
  body?: object;
  query?: object;
  params?: object;
}

const validate = (schema: ValidationSchema) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    if (schema.body) {
      const result = validateSchema(req.body, schema.body);
      if (!result.valid) errors.push(...result.errors);
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    next();
  };
};

// Auth Middleware
const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as AuthenticatedRequest['user'];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Error Handling

```typescript
// Typed Error Class
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Error Handler Middleware
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  res.json(user);
}));

app.use(errorHandler);
```

## NestJS Patterns

### Controller Typing

```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
}
```

### Service Layer

```typescript
// users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.userRepository.delete(id);
  }
}
```

### DTO Validation

```typescript
// create-user.dto.ts
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;
}

// update-user.dto.ts
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### Guards

```typescript
// auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler()
    );

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const decoded = this.jwtService.verify(token);
      request.user = decoded;

      if (requiredRoles) {
        return requiredRoles.includes(decoded.role);
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}

// Usage
@Controller('users')
export class UsersController {
  @Get()
  @UseGuards(AuthGuard)
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }
}
```

### Module Organization

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}

// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User],
      synchronize: true
    }),
    UsersModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
```

## Database Patterns

### TypeORM Entities

```typescript
// user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

// Repository Pattern
@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findAllWithPosts(): Promise<User[]> {
    return this.find({ relations: ['posts'] });
  }
}
```

### Prisma Client

```typescript
// prisma/schema.prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Usage
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { posts: true }
});

await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    posts: {
      create: [
        { title: 'First Post' },
        { title: 'Second Post' }
      ]
    }
  }
});
```

### Migrations

```typescript
// TypeORM Migration
export class CreateUsersTable1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true
          },
          {
            name: 'name',
            type: 'varchar'
          },
          {
            name: 'password',
            type: 'varchar'
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

## API Patterns

### REST API Design

```typescript
// Standardized Response Types
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

// Controller Response
app.get('/users/:id', asyncHandler(async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    const response: ApiResponse<User> = {
      success: true,
      data: user
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        message: error.message,
        code: 'USER_NOT_FOUND'
      }
    };
    res.status(404).json(response);
  }
}));
```

### GraphQL (TypeGraphQL)

```typescript
// user.type.ts
@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => [Post])
  posts: Post[];
}

// user.resolver.ts
@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UsersService) {}

  @Query(() => User)
  async user(@Arg('id', () => ID) id: string): Promise<User> {
    return this.userService.findById(id);
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Mutation(() => User)
  async createUser(
    @Arg('data') data: CreateUserInput
  ): Promise<User> {
    return this.userService.create(data);
  }
}
```

## Best Practices

1. **Type everything** - Request bodies, responses, parameters
2. **Use validation** - Class-validator for DTOs
3. **Organize by feature** - Modules, not layers
4. **Use dependency injection** - Enable testing
5. **Handle errors consistently** - Custom error classes
6. **Type database entities** - TypeORM or Prisma
7. **Use middleware** - Auth, validation, logging

## Related References

- `api-design.md` - API contract types
- `architecture-patterns.md` - Backend architecture
- `async-patterns.md` - Async server patterns
- `testing-strategy.md` - Testing backend code
