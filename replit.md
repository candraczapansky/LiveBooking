# BeautyBook - Salon Management System

## Overview

BeautyBook is a comprehensive salon management system built with a React frontend and Express backend. It's designed to help salon businesses manage their services, staff, appointments, clients, memberships, marketing campaigns, and generate reports.

The system uses a modern tech stack with React for the UI, Express for the API, and Drizzle ORM for database operations. It features a clean, user-friendly interface with a dashboard-based layout for different management functions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### June 23, 2025 - UI Theming, Data Persistence, and Unlayer Email Editor Integration
- Added comprehensive text color editing capabilities to the appearance settings
- Implemented primary and secondary text color controls with live preview
- Added text color preset saving and management functionality  
- Created custom CSS properties for text colors (--text-primary, --text-secondary)
- Enhanced theming system to support both background and text color customization
- Fixed dark mode functionality with proper page background and white text colors
- Updated dropdown elements to match custom theme colors from settings
- Migrated to PostgreSQL database for permanent data storage
- Client data now persists permanently across sessions
- Completed Square payment integration migration from Stripe
- Integrated Unlayer email template editor for professional marketing campaigns
- Added email template design storage in database with HTML content generation
- Enhanced marketing campaigns with visual email template creation capabilities

## System Architecture

### Frontend Architecture

The frontend is built with React and uses a component-based architecture following modern best practices:

1. **UI Components**: Uses the shadcn/ui component library (based on Radix UI) for consistent design
2. **Routing**: Uses Wouter for lightweight client-side routing
3. **State Management**: Combines React context (for auth state) with React Query for server state management
4. **Styling**: Uses Tailwind CSS for utility-first styling

### Backend Architecture

The backend is a Node.js Express server that follows a RESTful API design:

1. **API Layer**: Express routes that handle HTTP requests
2. **Data Layer**: Uses Drizzle ORM to interact with the PostgreSQL database
3. **Authentication**: Session-based authentication with user roles (admin, staff, client)

### Database

The application uses PostgreSQL (via Drizzle ORM) with a schema designed around these main entities:
- Users (authentication and basic user info)
- Staff (salon professionals)
- Services & Categories
- Appointments
- Clients
- Memberships
- Payments

## Key Components

### Frontend Components

1. **Layout Components**:
   - `SidebarController`: Main navigation sidebar
   - `Header`: Top application bar

2. **Page Components**:
   - `Dashboard`: Overview of salon activity
   - `Services`: Service management
   - `Staff`: Staff management
   - `Appointments`: Scheduling system
   - `Clients`: Client management
   - `Memberships`: Membership plans
   - `Reports`: Business analytics
   - `Marketing`: Marketing campaigns
   - `Settings`: System configuration

3. **UI Components**:
   - Comprehensive UI kit built on shadcn/ui and Radix primitives
   - Forms with validation via react-hook-form and zod

### Backend Components

1. **API Routes**: Organized by entity type (users, services, appointments, etc.)
2. **Storage Module**: Database access layer abstracting Drizzle ORM operations
3. **Authentication Middleware**: For protecting routes based on user roles

## Data Flow

1. **Authentication Flow**:
   - User submits login credentials via login form
   - Server validates credentials and creates a session
   - Client stores auth state in React context
   - Protected routes check auth context before rendering

2. **Data Fetching Flow**:
   - Components use React Query hooks to request data
   - Requests go through API layer to server
   - Server validates request, queries database via Drizzle ORM
   - Response data flows back to components for rendering

3. **Form Submission Flow**:
   - Forms capture user input with react-hook-form
   - Validation occurs using zod schemas
   - Form data is submitted to API endpoints
   - Server validates input against schemas
   - Database is updated and response returned to client

## External Dependencies

### Frontend Dependencies

1. **UI Components**:
   - Radix UI primitives for accessible components
   - shadcn/ui for pre-built component styles
   - Lucide React for icons

2. **State Management**:
   - @tanstack/react-query for server state

3. **Forms and Validation**:
   - react-hook-form for form state management
   - zod and @hookform/resolvers for schema validation

4. **Data Visualization**:
   - Recharts for charts and graphs

5. **Payment Processing**:
   - Stripe JS and React Stripe JS for payment integration

### Backend Dependencies

1. **API Server**:
   - Express for HTTP server
   - Drizzle ORM for database operations
   - Zod for validation

2. **Database**:
   - @neondatabase/serverless for PostgreSQL connection
   - Drizzle ORM for query building

3. **Authentication**:
   - connect-pg-simple for session management

## Deployment Strategy

The application is configured for deployment on Replit with:

1. **Build Process**:
   - Vite for frontend bundling
   - esbuild for server bundling
   - Combined build output in the dist directory

2. **Runtime Configuration**:
   - Environment variables for database connection, etc.
   - Production mode optimization

3. **Entry Points**:
   - Development: `npm run dev` running server/index.ts with tsx
   - Production: `npm run start` running the bundled output

4. **Database Migrations**:
   - Drizzle Kit for schema migrations

The deployment process is automated via Replit's deployment configuration, which builds the application and starts it in production mode.

## Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM and includes:

1. **Users**: Authentication and profile information
2. **Service Categories**: Grouping of services
3. **Services**: Specific services offered by the salon
4. **Staff**: Professionals working at the salon
5. **Staff Services**: Many-to-many relationship between staff and services
6. **Appointments**: Booking information
7. **Memberships**: Subscription plans
8. **Client Memberships**: Clients' active memberships
9. **Payments**: Transaction records