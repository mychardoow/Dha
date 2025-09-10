# DHA Digital Services Pro - Military-Grade Security Platform

## Overview

This is a production-ready digital services platform designed with military-grade security features. The application provides comprehensive security solutions including biometric authentication, quantum encryption, real-time fraud detection, document processing with OCR capabilities, and advanced monitoring systems. Built as a full-stack TypeScript application, it combines modern web technologies with enterprise-level security measures to create a robust platform suitable for high-security environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in strict mode
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with dark theme and custom security-themed color palette
- **State Management**: TanStack Query for server state management and caching
- **Real-time Communication**: Socket.IO client for WebSocket connections
- **Charts**: Chart.js and React-Chartjs-2 for data visualization
- **Build Tool**: Vite with TypeScript support and custom path aliases

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Security Middleware**: Helmet for security headers, express-rate-limit for API protection
- **Real-time**: Socket.IO server for WebSocket communication
- **File Processing**: Multer for file uploads, Tesseract.js for OCR processing
- **Encryption**: CryptoJS for client-side encryption, native crypto for server-side operations

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Neon serverless connection pooling with WebSocket support

### Authentication and Authorization
- **Primary Authentication**: JWT tokens with 24-hour expiration
- **Password Security**: Bcrypt with salt rounds of 12
- **Biometric Authentication**: Multi-modal biometric support (face, fingerprint, voice, iris)
- **Role-based Access Control**: User roles with granular permissions
- **Session Management**: Secure session handling with encrypted storage
- **API Key Authentication**: Secondary authentication method for service-to-service communication

### Security Features
- **Quantum Encryption**: Advanced encryption with high-entropy key generation
- **Fraud Detection**: Real-time behavioral analysis and risk scoring
- **Rate Limiting**: Multiple tiers of rate limiting for different endpoints
- **Security Headers**: Comprehensive security headers via Helmet
- **IP Filtering**: Configurable IP allowlist/blocklist
- **Security Logging**: Detailed security event logging and monitoring
- **Document Verification**: Authenticity verification for uploaded documents

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect

### Security Services
- **JWT Authentication**: JSON Web Token implementation for secure authentication
- **Bcrypt**: Password hashing and verification
- **CryptoJS**: Client-side encryption utilities
- **Helmet**: Security middleware for Express applications

### File Processing
- **Multer**: File upload middleware for Express
- **Tesseract.js**: OCR (Optical Character Recognition) for document text extraction

### Real-time Communication
- **Socket.IO**: WebSocket library for real-time bidirectional communication
- **WebSocket (ws)**: Native WebSocket support for database connections

### Frontend Libraries
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing library
- **Radix UI**: Unstyled, accessible UI primitives
- **Chart.js**: Data visualization and charting library
- **React Hook Form**: Form state management with validation

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: JavaScript bundler for production builds
- **Replit Integration**: Development environment integration with cartographer and error overlay plugins