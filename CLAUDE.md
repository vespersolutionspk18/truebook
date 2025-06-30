# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TBAI is a vehicle inventory management application built for automotive dealerships. The core functionality revolves around VIN-based vehicle tracking, Monroney label processing, and inventory analytics.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture Overview

### Application Structure
- **Next.js App Router**: Uses the new App Router with server components
- **Authentication**: NextAuth.js with session-based auth protecting `/dashboard/*` routes
- **Database**: PostgreSQL with Prisma ORM, focused on vehicle and user data
- **UI**: shadcn/ui components with Tailwind CSS and CSS variables for theming

### Key Data Models
- **Vehicle**: Core entity tracked by VIN with flexible key-value properties via `VehiclePair`
- **Monroney**: Automotive window sticker data with structured `MonroneyPair` storage
- **User**: Authentication with OAuth support and user settings (including dark mode)
- **MonroneyCredentials**: OAuth tokens for external Monroney API integration

### Critical Integrations
- **PDF Processing**: Uses pdfjs-dist and pdf-parse for Monroney label parsing
- **Gemini AI**: Integrated via `GEMINI_API_KEY` for AI-powered features
- **External APIs**: OAuth-based Monroney data provider integration

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth secret (minimum 32 characters)
- `NEXTAUTH_URL` - Application URL
- `GEMINI_API_KEY` - Google Gemini API key

## Database Schema

The schema uses a flexible key-value approach:
- `Vehicle` → `VehiclePair[]` for dynamic vehicle properties
- `Monroney` → `MonroneyPair[]` for structured label data
- Full user management with OAuth account linking
- Login attempt tracking for security

Database migrations are in `prisma/migrations/` and should be run with `npx prisma migrate dev`.

## Authentication & Authorization

- **Middleware**: `middleware.ts` protects dashboard routes
- **Session Management**: Uses NextAuth.js with database sessions
- **User Registration**: Custom registration flow with password hashing
- **OAuth Support**: Configured for external authentication providers

## PDF & Document Processing

The application processes Monroney labels (automotive window stickers):
- PDF parsing via pdfjs-dist with worker configuration
- Data extraction and structured storage in database
- Mock data available in `mock-data/monroneys/` for development

## UI Components & Styling

- **Component System**: shadcn/ui with "New York" style variants
- **Theming**: CSS variables for colors, supports dark mode
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first design with sidebar navigation

## API Routes

RESTful API structure in `app/api/`:
- `/api/vehicles` - Vehicle CRUD operations
- `/api/monroney` - Monroney label processing
- `/api/auth` - NextAuth.js authentication
- `/api/integrations` - External service integrations

## Development Notes

- **Webpack Config**: Custom null-loader for node-pre-gyp HTML files
- **TypeScript**: Strict mode enabled with @ path alias
- **Mock Data**: Organized development data in `mock-data/`
- **Hot Reload**: Turbopack enabled for faster development builds

When working with vehicle data, always use the VIN as the primary identifier. The flexible VehiclePair/MonroneyPair system allows for dynamic properties without schema changes.