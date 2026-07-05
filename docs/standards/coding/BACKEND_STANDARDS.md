# 后端工程规范

## 目录结构

```
server/                                 # 后端根目录
│
├── api/                                # API 路由层（BFF）
│   └── [resource]/
│       ├── route.ts                    # 路由处理（GET, POST）
│       └── [id]/
│           └── route.ts               # 路由处理（GET, PATCH, DELETE）
│
├── services/                           # 业务逻辑层
│   └── [domain]/
│       ├── index.ts                    # 统一导出
│       ├── book.service.ts             # 业务逻辑实现
│       └── book.service.test.ts        # 单元测试
│
├── models/                             # 数据模型层
│   ├── index.ts                        # 统一导出
│   ├── book.model.ts                   # 数据模型定义
│   └── schemas/                        # 验证 Schema
│       └── book.schema.ts
│
├── storage/                            # 数据存储层
│   ├── index.ts                        # 统一导出
│   ├── db.ts                           # 数据库连接
│   ├── book.repository.ts              # 数据访问实现
│   └── migrations/                     # 数据库迁移
│       └── 001_create_books.ts
│
├── middleware/                          # 中间件
│   ├── index.ts
│   ├── error-handler.ts                # 错误处理中间件
│   ├── validator.ts                    # 参数验证中间件
│   └── logger.ts                       # 日志中间件
│
├── utils/                              # 工具函数
│   ├── index.ts
│   ├── id-generator.ts                 # ID 生成器
│   └── date-utils.ts                   # 日期工具
│
├── types/                              # 类型定义
│   ├── index.ts
│   └── common.types.ts                 # 通用类型
│
├── constants/                          # 常量定义
│   ├── index.ts
│   └── error-codes.ts                  # 错误码
│
└── config/                             # 配置文件
    ├── index.ts
    ├── database.ts                     # 数据库配置
    └── app.ts                          # 应用配置
```

## 核心原则

### 1. 分层架构

```
请求 → API层 → Service层 → Repository层 → 数据库
         ↓         ↓            ↓
      参数验证   业务逻辑    数据访问
```

**各层职责：**

- **API 层**：处理 HTTP 请求，参数验证，调用 Service
- **Service 层**：业务逻辑，事务处理
- **Repository 层**：数据访问，SQL 查询
- **Model 层**：数据结构定义，验证 Schema

### 2. 单一职责

```typescript
// ✅ 正确：每个文件只负责一件事
// services/book.service.ts
export class BookService {
  constructor(private bookRepository: BookRepository) {}
  
  async createBook(data: CreateBookDTO): Promise<Book> {
    // 只负责创建书籍的业务逻辑
  }
}

// storage/book.repository.ts
export class BookRepository {
  async findById(id: string): Promise<Book | null> {
    // 只负责数据访问
  }
}

// ❌ 错误：混合业务逻辑和数据访问
export class BookService {
  async createBook(data: CreateBookDTO): Promise<Book> {
    const db = await getDb();
    db.prepare('INSERT INTO books ...').run(...);
    // 发送通知...
    // 记录日志...
  }
}
```

### 3. 依赖注入

```typescript
// ✅ 正确：通过构造函数注入依赖
export class BookService {
  constructor(
    private bookRepository: BookRepository,
    private notificationService: NotificationService
  ) {}
}

// ❌ 错误：直接实例化依赖
export class BookService {
  private bookRepository = new BookRepository();
}
```

### 4. 错误处理

```typescript
// 定义业务错误类
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

// 使用示例
export class BookService {
  async getBook(id: string): Promise<Book> {
    const book = await this.bookRepository.findById(id);
    if (!book) {
      throw new BusinessError('BOOK_NOT_FOUND', '书籍不存在', 404);
    }
    return book;
  }
}
```

## 命名规范

### 文件命名

- **Service 文件**：`xxx.service.ts`
- **Repository 文件**：`xxx.repository.ts`
- **Model 文件**：`xxx.model.ts`
- **Schema 文件**：`xxx.schema.ts`
- **工具文件**：`xxx.utils.ts`
- **类型文件**：`xxx.types.ts`

### 变量命名

- **类**：`PascalCase`（如 `BookService`）
- **方法**：`camelCase`（如 `createBook`）
- **常量**：`UPPER_SNAKE_CASE`（如 `MAX_BOOK_COUNT`）
- **接口/类型**：`PascalCase`（如 `Book`, `CreateBookDTO`）

## API 路由规范

### RESTful 风格

```typescript
// GET    /api/books          → 获取书籍列表
// POST   /api/books          → 创建书籍
// GET    /api/books/[id]     → 获取单个书籍
// PATCH  /api/books/[id]     → 更新书籍
// DELETE /api/books/[id]     → 删除书籍
```

### 路由处理示例

```typescript
// app/api/books/route.ts
import { NextResponse } from 'next/server';
import { BookService } from '@/server/services/book.service';
import { CreateBookSchema } from '@/server/models/schemas/book.schema';

const bookService = new BookService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const books = await bookService.getBooks({ page, limit });
    return NextResponse.json(books);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreateBookSchema.parse(body);
    
    const book = await bookService.createBook(validatedData);
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

## Service 层规范

### Service 类结构

```typescript
// services/book.service.ts
import { BookRepository } from '@/server/storage/book.repository';
import { CreateBookDTO, UpdateBookDTO } from '@/server/types/book.types';
import { BusinessError } from '@/server/utils/errors';

export class BookService {
  constructor(private bookRepository: BookRepository) {}
  
  async getBooks(params: GetBooksParams): Promise<Book[]> {
    return this.bookRepository.findMany(params);
  }
  
  async getBookById(id: string): Promise<Book> {
    const book = await this.bookRepository.findById(id);
    if (!book) {
      throw new BusinessError('BOOK_NOT_FOUND', '书籍不存在', 404);
    }
    return book;
  }
  
  async createBook(data: CreateBookDTO): Promise<Book> {
    // 业务验证
    await this.validateBookData(data);
    
    // 创建书籍
    const book = await this.bookRepository.create(data);
    
    // 其他业务逻辑
    await this.onCreateBook(book);
    
    return book;
  }
  
  async updateBook(id: string, data: UpdateBookDTO): Promise<Book> {
    const book = await this.getBookById(id);
    
    // 业务验证
    await this.validateBookData(data, id);
    
    // 更新书籍
    const updatedBook = await this.bookRepository.update(id, data);
    
    return updatedBook;
  }
  
  async deleteBook(id: string): Promise<void> {
    const book = await this.getBookById(id);
    
    // 业务验证
    await this.validateDeleteBook(book);
    
    // 删除书籍
    await this.bookRepository.delete(id);
  }
  
  // 私有方法：业务验证
  private async validateBookData(data: CreateBookDTO, excludeId?: string): Promise<void> {
    // 验证逻辑
  }
  
  // 私有方法：创建后处理
  private async onCreateBook(book: Book): Promise<void> {
    // 创建后的业务逻辑
  }
}
```

## Repository 层规范

### Repository 类结构

```typescript
// storage/book.repository.ts
import { getDb } from '@/server/storage/db';
import { Book, CreateBookDTO, UpdateBookDTO } from '@/server/types/book.types';

export class BookRepository {
  async findMany(params: FindManyParams): Promise<Book[]> {
    const db = await getDb();
    
    const books = db.prepare(`
      SELECT * FROM books 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(params.limit, params.offset) as any[];
    
    return books.map(this.mapToBook);
  }
  
  async findById(id: string): Promise<Book | null> {
    const db = await getDb();
    
    const book = db.prepare(`
      SELECT * FROM books WHERE id = ?
    `).get(id) as any;
    
    return book ? this.mapToBook(book) : null;
  }
  
  async create(data: CreateBookDTO): Promise<Book> {
    const db = await getDb();
    const id = generateId();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO books (id, title, description, genre, platform, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.title, data.description, data.genre, data.platform, now, now);
    
    return this.findById(id) as Promise<Book>;
  }
  
  async update(id: string, data: UpdateBookDTO): Promise<Book> {
    const db = await getDb();
    const now = new Date().toISOString();
    
    db.prepare(`
      UPDATE books 
      SET title = ?, description = ?, genre = ?, platform = ?, updated_at = ?
      WHERE id = ?
    `).run(data.title, data.description, data.genre, data.platform, now, id);
    
    return this.findById(id) as Promise<Book>;
  }
  
  async delete(id: string): Promise<void> {
    const db = await getDb();
    
    db.prepare(`
      DELETE FROM books WHERE id = ?
    `).run(id);
  }
  
  // 私有方法：数据映射
  private mapToBook(row: any): Book {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      genre: row.genre,
      platform: row.platform,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

## Model 层规范

### 数据模型定义

```typescript
// models/book.model.ts
export interface Book {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookDTO {
  title: string;
  description: string;
  genre: string;
  platform: string;
}

export interface UpdateBookDTO {
  title?: string;
  description?: string;
  genre?: string;
  platform?: string;
}
```

### 验证 Schema

```typescript
// models/schemas/book.schema.ts
import { z } from 'zod';

export const CreateBookSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional().default(''),
  genre: z.enum(['玄幻', '都市', '科幻', '历史', '武侠', '仙侠', '游戏', '军事', '悬疑', '轻小说']),
  platform: z.enum(['起点中文网', '番茄小说', '晋江文学城', '纵横中文网', '其他']),
});

export const UpdateBookSchema = CreateBookSchema.partial();
```

## 错误处理规范

### 错误类定义

```typescript
// utils/errors.ts
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}
```

### 统一错误处理

```typescript
// middleware/error-handler.ts
import { NextResponse } from 'next/server';
import { BusinessError } from '@/server/utils/errors';

export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  if (error instanceof BusinessError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: error.errors },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Internal server error' },
    { status: 500 }
  );
}
```

## 测试规范

### 单元测试

```typescript
// services/book.service.test.ts
import { BookService } from './book.service';
import { BookRepository } from '@/server/storage/book.repository';

describe('BookService', () => {
  let bookService: BookService;
  let mockBookRepository: jest.Mocked<BookRepository>;
  
  beforeEach(() => {
    mockBookRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    bookService = new BookService(mockBookRepository);
  });
  
  describe('getBookById', () => {
    it('should return book when found', async () => {
      const mockBook = { id: '1', title: 'Test Book' };
      mockBookRepository.findById.mockResolvedValue(mockBook as any);
      
      const result = await bookService.getBookById('1');
      
      expect(result).toEqual(mockBook);
      expect(mockBookRepository.findById).toHaveBeenCalledWith('1');
    });
    
    it('should throw NotFoundError when book not found', async () => {
      mockBookRepository.findById.mockResolvedValue(null);
      
      await expect(bookService.getBookById('1')).rejects.toThrow('书籍不存在');
    });
  });
});
```

## 日志规范

### 日志工具

```typescript
// utils/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },
};
```

### 使用示例

```typescript
export class BookService {
  async createBook(data: CreateBookDTO): Promise<Book> {
    logger.info('Creating book', { title: data.title });
    
    try {
      const book = await this.bookRepository.create(data);
      logger.info('Book created successfully', { id: book.id });
      return book;
    } catch (error) {
      logger.error('Failed to create book', error);
      throw error;
    }
  }
}
```
