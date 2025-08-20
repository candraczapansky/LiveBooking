# Glo Head Spa - Salon Management System

## Overview

Glo Head Spa is a comprehensive salon management system designed to streamline operations for head spas and salons. It provides tools for managing services, staff, appointments, clients, memberships, marketing campaigns, and generating reports. The system aims to enhance business efficiency and client engagement through a modern, user-friendly interface.

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred color scheme: Pink primary color with black text for better readability and modern aesthetic.

## Recent Changes (August 20, 2025)

### ES Module Deployment Fix Completed ✅
- **@shared Alias Import Resolution**: Created automated post-build script to fix TypeScript path mapping issues for ES modules
- **Dynamic Import Support**: Fixed both static and dynamic imports from `@shared/schema` to proper relative paths
- **Cross-Platform Compatibility**: Script handles Windows/Unix path separators correctly
- **Build Process Enhanced**: Integrated fix-imports.js script to run after TypeScript compilation
- **All Server Routes Fixed**: Successfully resolved import issues in 8 server files including routes and storage modules
- **Production Ready**: Application now compiles and runs correctly for deployment with proper ES module support

### Previous Production Deployment Successfully Completed ✅
- **ES Module Import Issues Resolved**: Fixed all import paths in compiled JavaScript to include required `.js` extensions for Node.js ES modules compatibility
- **TypeScript Compilation Issues Fixed**: Resolved all TypeScript errors in server/routes/marketing.ts and server/routes/payments.ts
- **Import Path Corrections**: Systematically fixed corrupted import paths like `"..shared/schema"` → `"../shared/schema.js"`
- **Production Build Working**: Application now successfully runs in production mode on port 5004 with all services operational
- **Payment Schema Enhanced**: Added missing `notes` and `processedAt` fields to payments table schema
- **Error Handling Improved**: Fixed unknown error type handling with proper type guards
- **Build Configuration Updated**: Fixed tsconfig.json to properly compile TypeScript to JavaScript for deployment
- **Marketing Routes Fixed**: Resolved null value handling and missing method references
- **Database Schema Synchronized**: Payment model now includes all required fields for proper compilation

## System Architecture

### Frontend Architecture

The frontend is built with React, utilizing a component-based architecture. Key aspects include:
- **UI Components**: Uses the shadcn/ui library (based on Radix UI) for consistent and accessible design.
- **Routing**: Employs Wouter for lightweight client-side routing.
- **State Management**: Combines React Context for authentication and global states with React Query for efficient server state management and data fetching.
- **Styling**: Leverages Tailwind CSS for a utility-first approach to styling, ensuring a flexible and maintainable design system.
- **UI/UX Decisions**: Prioritizes a clean, dashboard-based layout. Color schemes are customizable with a preference for a pink primary color and black text for readability. Includes responsive design for various devices.

### Backend Architecture

The backend is an Express.js server developed using a RESTful API design. Its core components are:
- **API Layer**: Express routes handle HTTP requests, providing structured endpoints for various salon management functions.
- **Data Layer**: Drizzle ORM is used for robust interaction with the PostgreSQL database, abstracting SQL operations.
- **Authentication**: Implements session-based authentication supporting different user roles (admin, staff, client) to control access.

### Database

The application uses PostgreSQL, managed via Drizzle ORM, with a schema encompassing:
- Users (authentication, profiles)
- Staff (salon professionals, schedules)
- Services & Categories (service definitions, categorization)
- Appointments (booking, history)
- Clients (customer management)
- Memberships (subscription plans, client assignments)
- Payments (transaction records)
- Automation Rules (triggers for email/SMS)
- Notifications (system events)
- Payroll History (payroll records)
- Sales History (transaction tracking)
- Appointment History (audit trail for changes)

### Core System Features

- **Appointment Management**: Comprehensive scheduling system with conflict detection, staff schedule integration, timezone handling, and calendar display (day, week, month views). Includes features for appointment creation, editing, and status updates, with visual cues for payment status and service type.
- **Client Management**: Tools for managing client information, including CSV import/export and robust synchronization with appointment data.
- **Staff Management**: Functionality for staff profiles, schedules, and service assignments.
- **Service & Product Management**: Cataloging services and products, assigning to staff, and managing categories.
- **Membership Management**: Configuration of membership plans with auto-renewal capabilities and payment integration.
- **Marketing & Automation**: Email marketing campaigns with audience segmentation and an automated trigger system for email/SMS notifications based on appointment lifecycle events and checkout.
- **Point of Sale (POS)**: Integration for processing payments (cash, credit card) for services and products, with receipt generation and sales reporting.
- **Reporting**: Detailed reports for sales, clients, services, staff, payroll, and time clock, with historical data tracking and external payroll synchronization.
- **User Settings**: Customizable UI themes, including color preferences and appearance settings, persisted in the database.

## External Dependencies

### Frontend Dependencies

- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React (for icons).
- **State Management**: @tanstack/react-query.
- **Forms & Validation**: react-hook-form, zod, @hookform/resolvers.
- **Data Visualization**: Recharts.
- **Payment Processing**: Square Web SDK for credit card payments, Square Node.js SDK.

### Backend Dependencies

- **API Server**: Express.js, Drizzle ORM, Zod.
- **Database**: @neondatabase/serverless (for PostgreSQL connection), Drizzle ORM.
- **Authentication**: connect-pg-simple (for session management).
- **Email/SMS**: SendGrid (for email delivery), Twilio (for SMS).
- **Security & Utilities**: speakeasy (for 2FA), qrcode (for QR code generation).
- **Payment Processing**: Square Node.js SDK for payment processing integration.