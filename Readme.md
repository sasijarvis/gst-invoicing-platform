# GST Invoicing Platform - Backend API

A comprehensive backend API for managing GST-compliant invoicing, built with Node.js, Express.js, and Prisma ORM.

## 🚀 Features

- **User Management**: Registration, authentication, and role-based access control
- **Customer Management**: Complete customer lifecycle management with GST compliance
- **Product/Service Management**: Inventory and service catalog management
- **Invoice Management**: GST-compliant invoice generation with automatic calculations
- **Payment Tracking**: Payment recording and reconciliation
- **Recurring Invoices**: Automated recurring billing
- **Reporting**: Comprehensive financial and GST reports
- **Security**: JWT authentication, rate limiting, input validation

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## ⚡ Quick Start

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# Required: DATABASE_URL, JWT_SECRET
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The API will be running at `http://localhost:3001`

## 🔗 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/search` - Search customers

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/search` - Search products

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice by ID
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/send` - Send invoice via email
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Record payment
- `GET /api/payments/:id` - Get payment by ID
- `PUT /api/payments/:id` - Update payment

## 🗄️ Database Schema

The application uses Prisma ORM with MySQL 8.0. Key entities include:

- **Users**: User accounts and business information
- **Customers**: Customer details with GST compliance
- **Products**: Product/service catalog with tax information
- **Invoices**: GST-compliant invoices with automatic calculations
- **InvoiceItems**: Line items for invoices
- **Payments**: Payment records and tracking
- **RecurringInvoices**: Automated recurring billing

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting per endpoint
- CORS protection
- Input validation and sanitization
- SQL injection protection via Prisma
- XSS protection with Helmet

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `CORS_ORIGIN` | Allowed CORS origins | No |

## 🚀 Development Scripts

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

## 📊 Demo Data

After running `npm run db:seed`, you can use these demo credentials:

- **Admin**: admin@gstinvoicing.com / admin123
- **Demo User**: demo@gstinvoicing.com / demo123

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔧 Troubleshooting

### Common Issues

1. **Database connection issues**: Verify DATABASE_URL in .env
2. **JWT errors**: Ensure JWT_SECRET is set and secure
3. **Migration issues**: Try `npm run db:reset` to reset database
4. **Port conflicts**: Change PORT in .env file

### Logs

Check application logs for detailed error information. In development mode, full stack traces are provided.

## 📞 Support

For support and questions, please create an issue in the repository.
