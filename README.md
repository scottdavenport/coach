# Coach - AI Health & Fitness Companion

Coach is an intelligent AI-powered health and fitness companion that helps users track, analyze, and improve their wellness journey through natural conversation and data insights.

## 🚀 Features

### Core Functionality
- **AI-Powered Coaching**: GPT-4 powered conversations for personalized health guidance
- **Pattern Recognition**: Advanced analysis of user behavior across health, activity, mood, and sleep
- **Multi-Modal Input**: Support for text conversations, photo uploads (OCR), and file uploads
- **Health Data Integration**: Oura Ring integration for sleep and activity tracking
- **Conversation Insights**: Automatic extraction and storage of health-related data from conversations

### File Upload Support
- **Images**: OCR processing for workout screenshots and health data
- **Documents**: CSV, PDF, DOC, DOCX, TXT, MD, XLSX, ODS, PPTX
- **Smart Processing**: AI-powered content analysis and data extraction
- **Combined Limits**: Up to 10 files total with intelligent type detection

### Data Management
- **Conversation History**: Persistent chat history with context awareness
- **Health Metrics**: Daily, weekly, and trend-based health insights
- **Pattern Analysis**: Recognition of user behavior patterns and trends
- **Personalized Recommendations**: AI-generated insights based on user data

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for file uploads
- **AI**: OpenAI GPT-4 for conversation and analysis
- **Health Integration**: Oura Ring API
- **Styling**: Tailwind CSS with custom UI components
- **Testing**: Jest with React Testing Library

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication flows
│   └── dashboard/         # Main dashboard interface
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── card/             # Data display cards
│   ├── chat/             # Chat interface
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── supabase/         # Database client and schema
│   ├── oura/             # Oura Ring integration
│   └── pattern-recognition/ # AI pattern analysis
└── types/                 # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project
- OpenAI API key
- Oura Ring account (optional)

### Environment Setup
1. Clone the repository
2. Copy `env.example` to `.env.local`
3. Fill in your environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   OURA_CLIENT_ID=your_oura_client_id
   OURA_CLIENT_SECRET=your_oura_client_secret
   ```

### Installation
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📊 Database Schema

The app uses several key tables:
- `users`: User profiles and preferences
- `conversations`: Chat history and metadata
- `conversation_insights`: Extracted health data from conversations
- `events`: User activity and health events
- `weekly_cards`: Weekly health summaries and insights

## 🧪 Testing

```bash
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run lint       # Run ESLint
npm run build      # Build for production
```

## 🔧 Development

### Code Quality
- ESLint configuration for consistent code style
- TypeScript for type safety
- Pre-commit hooks for code quality

### API Development
- RESTful API routes in `/app/api`
- Supabase client for database operations
- OpenAI integration for AI features

### File Processing
- OCR processing for images using Supabase Edge Functions
- Document parsing for various file types
- Intelligent content extraction and analysis

## 🚀 Deployment

The app is configured for deployment on Vercel with:
- Automatic builds and deployments
- Environment variable management
- Edge function support for OCR processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues, please check the existing issues or create a new one in the GitHub repository.
