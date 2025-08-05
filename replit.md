# Overview

This is "더망고 자동화 시스템" (The Mango Automation System), a comprehensive automation platform for automatically collecting product images from Mango shopping mall and using Pixian AI API to remove backgrounds. The system is designed to streamline the image processing workflow for e-commerce thumbnail generation and background removal automation.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for fast development and building
- **Routing**: Wouter library for lightweight client-side routing with children-based layouts
- **State Management**: TanStack React Query for server state management and caching with custom query client
- **UI Components**: Shadcn/ui component library built on Radix UI primitives for consistent design
- **Styling**: TailwindCSS with custom CSS variables for theming and responsive design
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Framework**: Express.js with TypeScript for the REST API server
- **Authentication**: Passport.js with Local Strategy for session-based authentication
- **Session Management**: Express-session with MemoryStore for in-memory session storage
- **WebSocket**: Real-time communication using native WebSocket for automation status updates
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Build System**: ESBuild for server-side bundling and TypeScript compilation

## Data Storage Solutions
- **Database**: PostgreSQL using Neon Database as the cloud provider
- **ORM**: Drizzle ORM with type-safe schema definitions and migrations
- **Schema Design**: Normalized tables for users, settings, automation tasks, logs, and processed images
- **Connection**: @neondatabase/serverless for serverless PostgreSQL connections

## Authentication and Authorization
- **Strategy**: Session-based authentication using Passport.js Local Strategy
- **Default Credentials**: Admin user (username: `admin`, password: `roubeadmin`)
- **Session Storage**: In-memory session store with configurable expiration
- **Route Protection**: Middleware-based authentication checking for protected API routes

## Automation Services
- **Web Scraping**: Puppeteer for Chrome automation and product data extraction
- **Image Processing**: Pixian AI API integration for automated background removal
- **Queue Management**: Custom queue system for processing automation tasks with priority handling
- **File Storage**: Multi-provider storage system supporting local, S3, and FTP storage options

## Real-time Communication
- **WebSocket Server**: Native WebSocket implementation for real-time status updates
- **Message Types**: Structured message system for automation progress, errors, and completion notifications
- **Client Integration**: React hooks for WebSocket connection management and message handling

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL cloud database service for primary data storage
- **Connection Pool**: Serverless PostgreSQL connections with automatic scaling

## AI Services
- **Pixian AI API**: Third-party service for automated image background removal
- **Configuration**: API key management and quality settings for processing

## Automation Tools
- **Puppeteer**: Headless Chrome automation for web scraping Mango shopping mall
- **Chrome Browser**: Configurable headless/headful browser automation with custom launch arguments

## Cloud Storage (Optional)
- **AWS S3**: Optional cloud storage integration for processed images
- **FTP Servers**: Optional FTP storage support for legacy systems
- **Local Storage**: Default local file system storage with directory management

## Development Tools
- **Vite**: Development server and build tool with hot module replacement
- **TypeScript**: Full type safety across frontend and backend with shared schema definitions
- **Replit Integration**: Development environment integration with runtime error handling