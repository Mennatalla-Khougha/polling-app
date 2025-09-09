# Polling App 🗳️

A modern, full-stack polling application built with Next.js 15 and Supabase. Create polls, share them instantly, and watch results update in real-time.

![Project Status](https://img.shields.io/badge/Status-MVP%20Ready-green)
![Progress](https://img.shields.io/badge/Progress-70%25-blue)
![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2015%20%7C%20Supabase%20%7C%20TypeScript-purple)

## ✨ Features

### ✅ **Currently Working**

- 🔐 **User Authentication** - Secure login/register with Supabase Auth
- 📊 **Poll Creation** - Create polls with 2-10 options, public/private settings
- 🗳️ **Voting System** - Single and multiple choice voting with duplicate prevention
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎨 **Modern UI** - Clean, professional interface with shadcn/ui components
- 🔒 **Security** - Row Level Security (RLS) and input validation
- ⚡ **Real-time Counts** - Vote counts update automatically via database triggers

### 🚧 **In Progress**

- 🔄 **Live Updates** - Real-time vote updates across all clients (90% complete)
- 📱 **Mobile Optimization** - Enhanced mobile experience and touch interactions
- ✏️ **Poll Management** - Edit and delete functionality for poll creators

### 🎯 **Coming Soon**

- 📱 **QR Code Scanning** - Scan QR codes to open polls quickly
- 📊 **Advanced Analytics** - Detailed voting statistics and insights
- 🔗 **Enhanced Sharing** - Social media integration and share tokens

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### 1. Clone & Install

```bash
git clone <repository-url>
cd polling-app
npm install
```

### 2. Environment Setup

Create `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Setup

Run the SQL schema in your Supabase project:

```bash
# Copy contents of supabase/schema.sql and run in Supabase SQL Editor
```

### 4. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app in action! 🎉

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: TailwindCSS 4 + shadcn/ui components
- **Backend**: Next.js API Routes + Zod validation
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Deployment**: Vercel-ready configuration

## 📁 Project Structure

```
polling-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # ✅ Authentication routes
│   │   ├── login/               # Login page
│   │   └── register/            # Registration page
│   ├── (dashboard)/             # ✅ Protected user dashboard
│   │   ├── dashboard/           # Poll management dashboard
│   │   └── polls/               # Poll creation and editing
│   ├── (public)/                # ✅ Public voting interface
│   │   └── polls/[id]/          # Public poll voting page
│   ├── api/                     # ✅ API endpoints
│   │   ├── polls/               # Poll CRUD operations
│   │   └── votes/               # Voting logic
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # ✅ Landing page
├── components/                   # React components
│   ├── forms/                   # ✅ Form components
│   ├── polls/                   # ✅ Poll-related components
│   ├── layout/                  # Layout components
│   └── ui/                      # ✅ shadcn/ui components
├── lib/                         # Utilities and configurations
│   ├── supabase/                # ✅ Database clients
│   ├── types/                   # ✅ TypeScript definitions
│   ├── validations/             # ✅ Zod schemas
│   └── auth/                    # ✅ Auth context
├── supabase/                    # Database schema and migrations
└── public/                      # Static assets
```

## 🎮 How to Use

### For Poll Creators:

1. **Sign up/Login** - Create an account or log in
2. **Create Poll** - Navigate to dashboard and click "Create New Poll"
3. **Add Options** - Enter your question and 2-10 answer options
4. **Configure Settings** - Choose public/private and voting rules
5. **Share** - Copy the poll URL or share the QR code with participants

### For Voters:

1. **Visit Poll** - Click on the shared poll link
2. **Cast Vote** - Select your choice(s) and submit
3. **View Results** - See real-time results after voting
4. **Scan QR** - You can scan QR codes from creators to open polls quickly

## 🧪 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint checks
npm run type-check   # Run TypeScript checks
```

## 📊 Current Implementation Status

### ✅ **Completed Features** (~70% MVP)

- **Authentication System**: Full Supabase Auth integration
- **Database Schema**: Complete with RLS policies and triggers
- **Poll Creation**: Comprehensive form with validation
- **Voting System**: Core voting logic with duplicate prevention
- **API Layer**: RESTful endpoints with proper error handling
- **UI Foundation**: Responsive design with modern components
- **Security**: Input validation, RLS, and auth protection
- **QR Code Sharing**: Client-side QR generation with download on poll pages

### 🔧 **Architecture Highlights**

- **Type Safety**: Full TypeScript strict mode
- **Data Validation**: Zod schemas for API boundaries
- **Security**: Row Level Security policies, CSRF protection, Rate limiting
- **Performance**: Database triggers for real-time vote counting
- **Sharing**: QR codes generated client-side using `qrcode` library
- **Code Quality**: ESLint 9 with strict rules

## 🚀 Deployment

The app is configured for easy Vercel deployment:

1. **Push to GitHub** (or your preferred Git provider)
2. **Connect to Vercel** - Import your repository
3. **Add Environment Variables** - Same as `.env.local`
4. **Deploy** - Vercel handles the rest!

## 📖 Documentation

- **[Context](./context.md)** - Architecture and implementation details
- **[Backlog](./backlog.md)** - Feature roadmap and acceptance criteria
- **[Supabase Schema](./supabase/schema.sql)** - Database structure

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Check the Backlog** - See `backlog.md` for current priorities
2. **Follow Conventions** - TypeScript strict, ESLint clean
3. **Test Your Changes** - Ensure features work end-to-end
4. **Update Documentation** - Keep context.md and backlog.md current

### Development Guidelines

- Use TypeScript strict mode
- Follow established naming conventions
- Add proper error handling
- Update tests and documentation
- Ensure mobile responsiveness

## 🐛 Known Issues & Limitations

- Real-time updates require manual refresh (Supabase subscriptions pending)
- QR code scanning not yet implemented
- Mobile experience could be further optimized
- Advanced analytics features are planned for future releases

## 📄 License

This project is open source and available under the MIT License.

## 🙋‍♂️ Support & Questions

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check `context.md` for detailed architecture info
- **Development**: See `backlog.md` for current development priorities

---

**Built with ❤️ using Next.js 15, Supabase, and modern web technologies**

🌟 **Star this repo if you find it useful!**
