# Overview

TSR Planner is a mobile-first team task management application designed for small teams to efficiently track work items and maintain meeting records. The application centers around teams as the primary organizational unit, where each team can create and manage tasks, record meeting minutes, and track progress over time. The system emphasizes fast access and real-time collaboration while maintaining a clear audit trail of all task changes through automatically generated meeting minutes.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built as a single-page application using React with TypeScript. The frontend follows a component-based architecture with:

- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Context for authentication and team selection, with React Query for server state management
- **UI Framework**: Radix UI components with Tailwind CSS for styling, following the shadcn/ui design system
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Mobile-First Design**: Responsive layout optimized for mobile devices with bottom navigation

## Backend Architecture
The server implements a REST API using Express.js with TypeScript:

- **API Structure**: RESTful endpoints organized by resource type (users, teams, tasks, minutes)
- **Data Layer**: In-memory storage interface with plans for PostgreSQL integration via Drizzle ORM
- **Authentication**: Firebase Authentication integration for user management
- **Request Handling**: Express middleware for logging, JSON parsing, and error handling

## Database Design
The application uses Drizzle ORM with a PostgreSQL database featuring:

- **Users**: Store user profiles with admin flags and authentication data
- **Teams**: Primary organizational unit with default venues and member relationships
- **Team Members**: Junction table managing user-team relationships with coordinator roles
- **Tasks**: Work items with status tracking, priority levels, and member assignments
- **Minutes**: Meeting records tied to specific teams and dates
- **Snapshots**: Audit trail capturing task changes with timestamps and change types

## Authentication & Authorization
Role-based access control with four distinct permission levels:

- **Superadmin**: Immutable administrative account with full system access
- **Admin**: Full read/write access across all teams and user management capabilities
- **Coordinator**: Can manage tasks and minutes for their assigned teams
- **Member**: Read access to their teams with limited edit permissions on assigned tasks

## Key Design Patterns
- **Team-Scoped Data**: All primary entities belong to specific teams for data isolation
- **Audit Trail**: Automatic snapshot generation for task changes to maintain accountability
- **Mobile Optimization**: Bottom navigation and touch-friendly interface design
- **Real-Time Updates**: React Query for automatic data synchronization and optimistic updates

# External Dependencies

## Authentication Services
- **Firebase Authentication**: Handles user sign-in/sign-out with Google OAuth integration
- **Firebase SDK**: Client-side authentication state management

## Database & ORM
- **Neon Database**: PostgreSQL hosting service (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database operations and migrations
- **connect-pg-simple**: PostgreSQL session store for Express

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component system based on Radix UI

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **React Query**: Server state management and caching
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema definition

## Build & Deployment
- **esbuild**: Server-side bundling for production
- **Replit Integration**: Development environment with error handling and cartographer support