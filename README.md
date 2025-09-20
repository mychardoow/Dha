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