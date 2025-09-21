
# DHA Digital Services Platform

A comprehensive government digital services platform built for the Department of Home Affairs, South Africa.

## 🚀 Features

- **Document Generation**: Generate 21+ types of official documents
- **AI Assistant**: Government-grade AI assistance
- **Biometric Authentication**: Advanced security features
- **Real-time Monitoring**: Comprehensive system monitoring
- **Government APIs**: Integration with DHA, SAPS, ICAO services
- **Quantum Encryption**: Military-grade security

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4, Anthropic Claude
- **PDF Generation**: jsPDF, PDF-lib, PDFKit
- **Authentication**: JWT, Passport.js
- **Real-time**: WebSocket, Socket.io

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL database
- Government API keys (DHA, SAPS, ICAO)
- AI service API keys (OpenAI, Anthropic)

## 🔧 Local Development

1. **Clone the repository**:
   ```bash
   git clone [your-repo-url]
   cd dha-digital-services
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Generate security keys**:
   ```bash
   npm run generate-keys
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Netlify Deployment

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Build command: `npm run build`
   - Publish directory: `dist/public`
   - Functions directory: `netlify/functions`

3. **Configure environment variables** in Netlify dashboard:
   - All required secrets from `.env.example`
   - Database connection string
   - API keys for government services

### Manual Build

```bash
npm run build
```

## 🔐 Environment Variables

Required environment variables (see `.env.example`):

- `JWT_SECRET`: JWT signing secret (64+ chars)
- `SESSION_SECRET`: Session secret (32+ chars)
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key
- `DHA_NPR_API_KEY`: DHA NPR service key
- `SAPS_CRC_API_KEY`: SAPS CRC service key
- And more...

## 📚 API Documentation

- **Health Check**: `GET /api/health`
- **Authentication**: `POST /api/auth/login`
- **Document Generation**: `POST /api/documents/generate`
- **AI Assistant**: `POST /api/ai/chat`
- **Verification**: `POST /api/verify`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run security tests
npm run test:security

# Run integration tests
npm run test:integration
```

## 🔒 Security Features

- JWT authentication with secure sessions
- Rate limiting and DDoS protection
- Input validation and sanitization
- Encrypted data storage
- Audit logging
- Biometric authentication support
- Quantum encryption capabilities

## 📄 License

Government of South Africa - Department of Home Affairs

## 🤝 Contributing

This is a government project. Contributions are restricted to authorized personnel only.

## 📞 Support

For technical support, contact the DHA Digital Services team.

# DHA Digital Services Platform

A comprehensive South African Department of Home Affairs digital services platform providing document generation, verification, and AI assistance for all 23 official DHA document types.

## 🎯 Features

### Document Generation
- **All 23 Official DHA Document Types** including:
  - Identity Documents (Smart ID Card, ID Document Book)
  - Travel Documents (SA Passport, Temporary Passport, Emergency Travel Certificate)
  - Civil Documents (Birth Certificate, Marriage Certificate, Death Certificate, Divorce Decree)
  - Immigration Documents (11 types): Work Permits, Business Visas, Study Permits, Residence Permits
  - Official Certificates (Coming Soon)

### AI Assistant
- **Real OpenAI GPT-4o Integration** with military-grade responses
- **Admin Unlimited Access** with comprehensive system control
- Multi-language support for all 11 official SA languages
- Document processing and security analysis

### Security Features
- Military-grade document security with multiple verification layers
- Real-time monitoring and 24/7 continuous system health checks
- Biometric integration and digital signatures
- Advanced OCR with auto-fill capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Access the application at `http://localhost:5000`

### Default Credentials
- **Admin**: `admin` / `admin123`
- **User**: `user` / `password123`

## 🔧 Environment Variables

```env
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## 📦 Deployment

### Netlify Deployment

1. **Connect to GitHub**: Push your code to GitHub
2. **Deploy to Netlify**: 
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Deploy
   netlify deploy --prod
   ```
3. **Set Environment Variables** in Netlify dashboard:
   - `DATABASE_URL`
   - `OPENAI_API_KEY` 
   - `JWT_SECRET`

### Manual Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Shadcn/UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4o integration
- **Real-time**: Socket.IO for monitoring and notifications
- **Document Processing**: PDFKit, pdf-lib, Tesseract.js

## 📊 API Endpoints

### Document Templates
- `GET /api/documents/templates` - Get all 23 DHA document types
- `POST /api/documents/generate` - Generate specific document
- `GET /api/documents/verify/:id` - Verify document authenticity

### AI Assistant  
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/analytics` - AI usage analytics (admin only)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

## 🔐 Security

- **Authentication**: JWT-based with secure session management
- **Authorization**: Role-based access control (Admin/User)
- **Data Protection**: Encryption at rest and in transit
- **API Security**: Rate limiting, input validation, CORS protection
- **Document Security**: Digital signatures, watermarks, verification codes

## 🧪 Testing

```bash
# Run tests
npm test

# Check types
npm run check
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For technical support or questions about DHA Digital Services Platform, please contact the development team.

---

**Built with ❤️ for the South African Department of Home Affairs**