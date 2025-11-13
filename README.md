# OneClickTag

A modern SaaS application built with a monorepo structure featuring NestJS backend, React frontend, and shared TypeScript types.

## 🏗️ Architecture

This monorepo contains:

- **Backend** (`/backend`) - NestJS API with TypeScript, Prisma ORM, PostgreSQL
- **Frontend** (`/frontend`) - React 18 with Vite, TypeScript, Tailwind CSS, Shadcn UI
- **Shared** (`/shared`) - Shared TypeScript types and utilities
- **Database** - PostgreSQL with Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd OneClickTag
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

4. Start the database:
```bash
pnpm db:up
```

5. Set up the database schema:
```bash
cd backend
pnpm db:generate
pnpm db:push
```

6. Start the development servers:
```bash
# Start all services
pnpm dev

# Or start individually
pnpm backend:dev  # Backend on http://localhost:3000
pnpm frontend:dev # Frontend on http://localhost:5173
```

## 📁 Project Structure

```
OneClickTag/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # Users module
│   │   ├── common/         # Shared services (Prisma, etc.)
│   │   ├── app.module.ts   # Main application module
│   │   └── main.ts         # Application entry point
│   ├── prisma/             # Database schema and migrations
│   └── test/               # Test files
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utility functions
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # API services
│   └── public/             # Static assets
├── shared/                 # Shared TypeScript types
│   └── src/
│       ├── auth/           # Auth types and DTOs
│       └── user/           # User types and DTOs
├── docker-compose.yml      # Database services
└── package.json           # Root package.json with workspaces
```

## 🛠️ Available Scripts

### Root Level
- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm test` - Test all packages
- `pnpm db:up` - Start database services
- `pnpm db:down` - Stop database services

### Backend
- `pnpm backend:dev` - Start backend in development mode
- `pnpm --filter backend build` - Build backend
- `pnpm --filter backend test` - Run backend tests
- `pnpm --filter backend db:generate` - Generate Prisma client
- `pnpm --filter backend db:push` - Push schema to database
- `pnpm --filter backend db:migrate` - Run database migrations
- `pnpm --filter backend db:studio` - Open Prisma Studio

### Frontend
- `pnpm frontend:dev` - Start frontend in development mode
- `pnpm --filter frontend build` - Build frontend
- `pnpm --filter frontend preview` - Preview built frontend

## 🗄️ Database

The application uses PostgreSQL as the primary database with Prisma as the ORM.

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/oneclicktag?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# App
PORT=3000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL="http://localhost:5173"
```

### Database Commands

```bash
# Start database
pnpm db:up

# Generate Prisma client
cd backend && pnpm db:generate

# Push schema to database
cd backend && pnpm db:push

# Create and run migration
cd backend && pnpm db:migrate

# Open Prisma Studio
cd backend && pnpm db:studio

# Reset database
cd backend && pnpm db:reset
```

## 🎨 Frontend Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn UI** components
- **React Router** for routing
- **Axios** for API calls

## 🔧 Backend Features

- **NestJS** framework with TypeScript
- **Prisma ORM** with PostgreSQL
- **JWT Authentication** with Passport
- **Swagger API** documentation
- **Class validation** and transformation
- **Modular architecture** with guards and interceptors

## 📚 API Documentation

When the backend is running, visit:
- Swagger UI: http://localhost:3000/api

## 🔐 Authentication

The application includes a complete authentication system:

- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes and guards

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run backend tests
pnpm --filter backend test

# Run backend tests in watch mode
pnpm --filter backend test:watch

# Run backend e2e tests
pnpm --filter backend test:e2e
```

## 🚀 Deployment

### Backend Deployment

1. Build the application:
```bash
pnpm --filter backend build
```

2. Set production environment variables
3. Run database migrations:
```bash
pnpm --filter backend db:migrate
```

4. Start the application:
```bash
pnpm --filter backend start:prod
```

### Frontend Deployment

1. Build the application:
```bash
pnpm --filter frontend build
```

2. Deploy the `dist` folder to your hosting provider

## 📝 Development Guidelines

- Use TypeScript for all new code
- Follow the existing code structure and patterns
- Shared types should be placed in the `/shared` package
- Use Prettier for code formatting
- Use ESLint for code linting
- Write tests for new features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is private and proprietary.