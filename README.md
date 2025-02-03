# 🔬 TestPulse Backend

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)

> 🚀 A robust NestJS backend service for managing automated test results and analytics, featuring multi-environment support, role-based access control, and comprehensive API documentation.

## ✨ Key Features

🔄 **Test Run Management**

- Track and analyze test executions across different frameworks
- Real-time test result processing
- Comprehensive test history and trends

🔐 **Security & Access Control**

- Secure JWT-based authentication
- Role-based access control
- Multi-factor authentication support

🏢 **Organization Management**

- Multi-tenant architecture
- Organization-based user management
- Customizable organization settings

📨 **Smart Invitation System**

- User invitation workflow
- Role assignment during invitation
- Bulk invitation support

📚 **Documentation & Integration**

- Auto-generated Swagger documentation
- RESTful API endpoints
- Comprehensive API examples

🗄️ **Data Management**

- PostgreSQL database integration
- Prisma ORM for type-safe queries
- Automated database migrations

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center">🔧 <b>Core</b></td>
    <td align="center">📊 <b>Database</b></td>
    <td align="center">🔒 <b>Security</b></td>
    <td align="center">🧪 <b>Testing</b></td>
  </tr>
  <tr>
    <td>
      • NestJS<br/>
      • TypeScript<br/>
      • Node.js
    </td>
    <td>
      • PostgreSQL<br/>
      • Prisma ORM<br/>
      • Redis (Cache)
    </td>
    <td>
      • JWT<br/>
      • bcrypt<br/>
      • Helmet
    </td>
    <td>
      • Jest<br/>
      • Supertest<br/>
      • Testing Library
    </td>
  </tr>
</table>

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

✅ Node.js (v18 or higher)
✅ PostgreSQL
✅ Yarn package manager
✅ Redis (optional, for caching)

## 🚀 Getting Started

### 📥 Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd test-pulse-backend

# Install dependencies
yarn install
```

### ⚙️ Environment Setup

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/test_pulse

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h
BCRYPT_SALT_ROUNDS=10

# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 🗄️ Database Setup

```bash
# Run database migrations
yarn prisma migrate dev

# Seed initial data
yarn seed
```

### 🏃‍♂️ Running the Application

```bash
# Development
yarn start:dev

# Production
yarn start:prod

# Debug mode
yarn start:debug
```

## 📜 Available Scripts

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `yarn build`         | 🏗️ Build the application     |
| `yarn seed`          | 🌱 Seed the database         |
| `yarn start:dev`     | 🚀 Start in development mode |
| `yarn start:prod`    | 🚀 Start in production mode  |
| `yarn test`          | 🧪 Run tests                 |
| `yarn test:coverage` | 📊 Run tests with coverage   |
| `yarn lint`          | 🔍 Run ESLint                |
| `yarn format`        | ✨ Format code with Prettier |
