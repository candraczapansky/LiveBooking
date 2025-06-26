# BeautyBook - Salon Management System

## Overview

BeautyBook is a comprehensive salon management system built with a React frontend and Express backend. It's designed to help salon businesses manage their services, staff, appointments, clients, memberships, marketing campaigns, and generate reports.

The system uses a modern tech stack with React for the UI, Express for the API, and Drizzle ORM for database operations. It features a clean, user-friendly interface with a dashboard-based layout for different management functions.

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred color scheme: Pink primary color with black text for better readability and modern aesthetic.

## Recent Changes

### June 23, 2025 - UI Theming, Data Persistence, Complete Email Marketing System, and Automation Calendar Integration
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
- **Fully implemented and tested email marketing campaign system:**
  - Fixed Unlayer email template editor popup sizing and save functionality
  - Implemented proper template saving with forwardRef and useImperativeHandle patterns
  - Fixed email sending functionality by updating getUsersByAudience to use database queries
  - Added comprehensive audience filtering (All Clients, Regular Clients, New Clients, etc.)
  - Successfully tested email delivery through SendGrid with tracking capabilities
  - Marketing campaigns now properly send professional email templates to filtered client audiences
  - Fixed campaign status tracking - campaigns now correctly display "draft", "scheduled", or "sent" status
  - Resolved campaign scheduling validation issues - users can now schedule campaigns for future delivery
  - Database properly stores and updates campaign status based on actual email delivery
  - **Added precise time scheduling for campaigns:**
    - Implemented time picker alongside date picker for scheduled campaigns
    - Users can now specify exact delivery time (hour and minute) for scheduled campaigns
    - Time field automatically disables when "Send immediately" is checked or no date is selected
    - Backend properly combines date and time into precise timestamp for scheduling
    - Default time set to 9:00 AM for user convenience
- **Completed automation calendar integration:**
  - Created comprehensive automation trigger system in `server/automation-triggers.ts`
  - Integrated automation triggers with appointment booking, status changes, and checkout
  - Added automatic booking confirmation emails/SMS when appointments are created
  - Implemented status-based triggers for cancellations and no-shows
  - Added checkout completion automation triggers for post-service follow-ups
  - Created full CRUD API endpoints for managing automation rules
  - Fixed custom automation popup scrolling with proper overflow handling
  - Enhanced custom trigger name functionality for personalized automation workflows
  - Automated email/SMS delivery with dynamic template variable replacement
  - System now automatically sends appropriate communications based on appointment lifecycle events

### June 26, 2025 - Icon Background Removal and Button Icons Toggle Cleanup
- **Removed all icon background styling throughout the application:**
  - Eliminated background colors from dashboard stats cards (removed iconBgColor prop from StatsCard component)
  - Removed notification icon circular backgrounds in Recent Notifications component
  - Cleaned up CSS classes that applied bg- styles to icon containers
  - Icons now display without any background colors or rounded backgrounds
  - Maintained icon colors and sizing while removing visual backgrounds
- **Completed Button Icons toggle section removal:**
  - Removed Button Icons toggle from appearance settings interface
  - Cleaned up all references to showButtonIcons state and localStorage storage
  - Removed CSS classes for hiding/showing button icons (.hide-button-icons)
  - Icons are now permanently enabled throughout the application interface
  - Simplified settings page by removing unnecessary toggle functionality

### June 25, 2025 - Staff and Schedule Page UI Simplification, Database Color Preferences, Mobile Login Interface Improvements
- **Simplified staff page to show staff names list first:**
  - Updated staff page to display clean list of staff members with names and titles only
  - Added click navigation to individual staff schedules when staff member is clicked
  - Kept edit and delete buttons available as quick action icons
  - Added helpful instruction text guiding users to click for schedule access
  - Improved mobile accessibility with larger touch targets and cleaner layout
- **Simplified schedule page to show staff names list first:**
  - Modified schedule page to display staff members in a list format
  - Added click functionality to navigate to individual staff schedule details
  - Shows schedule count badge for each staff member
  - Includes search functionality to filter staff by name
  - Added "Manage All" button for advanced schedule management access
  - Consistent design pattern with staff page for better user experience
- **Implemented database storage for user color preferences:**
  - Created `user_color_preferences` table to permanently store user theme settings
  - Added API endpoints for saving and retrieving color preferences by user ID
  - Updated settings page to load preferences from database instead of localStorage
  - Auto-saves color changes to database while maintaining localStorage backup
  - Includes storage for primary color, text colors, dark mode, and saved color palettes
  - Migrated from temporary localStorage to permanent database persistence
- **Removed Text Color Presets section:**
  - Cleaned up settings interface by removing redundant preset options
  - Maintained custom saved text colors functionality for user personalization
  - Simplified color picker interface while preserving full customization capabilities
- **Enhanced mobile login/register interface:**
  - Fixed tab display issues by replacing problematic Radix Tabs with custom flex layout
  - Significantly reduced interface bulk with compact design and smaller input fields
  - Resolved focus outline cutoff issues using custom box shadows instead of focus rings
  - Added proper container padding and margins to prevent visual clipping
  - Removed "Continue as Guest" button as user has separate client/staff frontends
  - Applied consistent border styling and smooth transitions across all form elements
  - Made login interface more symmetrical with balanced proportions and centered layout
  - Enhanced visual hierarchy with improved spacing and button sizing
  - Database connectivity confirmed working with all user authentication functioning properly

### June 24, 2025 - Mobile UI Improvements, SMS Marketing Fixes, Staff Schedule Completion, POS Sales Reporting Integration, Complete Database Migration, and Email Placeholder Cleanup
- **Enhanced mobile button accessibility:**
  - Increased all button touch targets to meet 44px minimum standard
  - Fixed overlapping buttons in client page header with responsive layout
  - Improved date navigation buttons in appointments page
  - Enhanced icon buttons across marketing and client pages for better mobile interaction
- **Fixed mobile form issues:**
  - Resolved checkbox touch interaction problems by replacing HTML inputs with Radix UI components
  - Made checkboxes 24px on mobile for better accessibility
  - Added clickable labels for easier interaction
  - Fixed popup scrolling in Add/Edit Client dialogs
  - Removed unwanted autocomplete text from email input fields
- **Improved SMS marketing functionality:**
  - Added phone number validation to filter out placeholder/test numbers
  - Enhanced error messaging for SMS campaigns with invalid phone numbers
  - Fixed SMS delivery issues by properly validating phone number formats
  - Updated client feedback to clearly indicate SMS marketing requirements
- **Fixed membership dialog mobile scrolling:**
  - Added proper overflow and height constraints to membership form popup
  - Ensured add/edit membership dialog scrolls properly on mobile devices
- **Added text color customization to mobile settings:**
  - Implemented primary and secondary text color controls
  - Added color picker and text input for custom colors
  - Created text color presets for quick selection
  - Added live preview functionality for text colors
  - Integrated with existing theme system for persistent color changes
- **Enhanced color selection with customizable brand presets:**
  - Replaced static brand colors with saveable custom brand color slots
  - Added "Save Current" functionality for both primary colors and text color combinations
  - Implemented delete functionality for saved color presets
  - Created empty state messages to guide users in building their brand palette
  - Enhanced user experience with personalized color management system
- **Added mobile product creation functionality:**
  - Integrated product creation directly into Point of Sale interface
  - Added mobile-optimized product form with essential fields (name, price, description, category, stock)
  - Implemented floating action button for quick product creation on mobile devices
  - Added form validation and error handling for required fields
  - Connected to existing product API endpoints for seamless integration
- **Updated default color scheme:**
  - Changed primary color to pink (HSL: 330 81% 60%) for a modern, beauty-focused aesthetic
  - Set default text color to black for improved readability and contrast
  - Updated both light and dark mode variants to maintain consistency
  - Enhanced visual appeal while maintaining accessibility standards
- **Fixed settings page dark mode auto-activation:**
  - Resolved issue where visiting settings page automatically switched to dark mode
  - Updated dark mode initialization logic to prevent unwanted theme changes
  - Settings page now properly respects current theme state without forcing changes
- **Fixed all button theming issues:**
  - Updated "Edit Personal Information" button in mobile settings to use dynamic custom color
  - Fixed hardcoded blue button color that wasn't responding to theme changes
  - All buttons throughout the application now properly inherit custom color settings
  - Removed hardcoded red sidebar background color that was overriding theme settings
- **Enhanced mobile appearance settings interface:**
  - Fixed nested button console warnings by restructuring saved color presets
  - Improved mobile layout with larger touch targets (56px+ minimum height)
  - Changed Quick Colors from 6 columns to 3 for better mobile visibility
  - Enhanced Custom Color section with side-by-side color picker and text input
  - Redesigned saved brand colors to use 2-column grid with better spacing
  - Fixed saved text colors to use single column for better mobile readability
  - Added color swatches to text color presets for visual clarity
  - Updated all icons to use custom text color scheme instead of hardcoded colors
  - Applied consistent text color theming to labels and interface elements
- **Completed staff schedule functionality:**
  - Fixed foreign key constraint issue by adding staff record to database
  - Resolved duplicate header layout issue in schedule page
  - Fixed API request structure for schedule creation, updates, and deletion
  - Updated form validation schema to make service categories optional
  - Staff schedule creation, editing, and deletion now fully functional
  - Schedule page properly integrates with app layout without duplicate navigation elements
  - **Resolved infinite loop error in schedule form:**
    - Fixed checkbox handling for multiple day selection
    - Eliminated dual event handlers causing infinite renders
    - Optimized sidebar state checking to prevent unnecessary re-renders
    - Used memoized default date values to prevent form resets
    - Multiple day schedule creation now works without errors
- **Completed dual payment processing system:**
  - Successfully configured Square Web SDK with proper environment detection
  - Fixed ApplicationIdEnvironmentMismatchError by using correct sandbox/production URLs
  - Credit card payment form now displays properly in appointment checkout
  - Square payment tokenization working correctly on frontend
  - Implemented direct Square API integration bypassing SDK authentication issues
  - Square access token verified working with direct API calls to production environment
  - Cash payment system fully functional for immediate in-person transactions
  - Added proper OAuth redirect URL configuration for Square app
  - Both credit card and cash payment methods process payments successfully
  - Fixed payment completion flow to close dialog immediately after successful payment
  - Payment system updates appointment status to "paid" and shows green indicator
  - Payment system fully functional for production use with streamlined user experience
- **Enhanced appointment calendar visual feedback:**
  - Updated appointment calendar to show paid appointments with green "Paid" badge
  - Changed confirmed appointment status color from green to blue for better distinction
  - Added payment confirmation API calls after successful payment processing
  - Fixed payment status update flow for both cash and credit card payments
  - Appointments now visually turn green immediately after payment completion
- **Improved mobile appointment interface:**
  - Centered "Add appointment" button text in mobile view for better alignment
  - Enhanced touch accessibility and visual consistency across mobile interface
- **Updated Point of Sale payment system:**
  - Migrated POS checkout from old payment system to Square Web SDK
  - Fixed payment form initialization and error handling
  - Added proper styling and autofill support for payment fields
  - Enhanced accessibility with proper ARIA labels and roles
  - Both POS and appointment checkout now use consistent Square payment integration
- **Fixed POS sales reporting integration:**
  - Added payment type and description fields to payments database schema
  - Updated payment creation endpoint to save POS transaction records to database
  - Modified reports page to include all completed payments (appointments + POS sales)
  - Fixed revenue calculations to combine appointment and POS payment data
  - Changed "Total Appointments" metric to "Total Transactions" showing both payment types
  - POS sales now properly appear in monthly sales charts and revenue totals
- **Completed migration to permanent PostgreSQL database storage:**
  - Migrated entire system from in-memory storage to PostgreSQL database
  - All salon data now persists permanently (staff, appointments, products, services, clients, etc.)
  - Database schema updated with all necessary tables and relationships
  - System initialization includes essential salon data (services, products, staff, memberships)
  - Data integrity maintained across server restarts and application updates
  - Enhanced data reliability for production salon management operations
- **Cleaned up email input field placeholders:**
  - Removed "john.doe@example.com" placeholder from all email input fields
  - Updated placeholder text to "Enter email address" for better user experience
  - Fixed placeholders in client forms, booking widget, staff forms, and login page
  - Eliminated unwanted autocomplete suggestions in mobile browsers
- **Simplified staff member creation form:**
  - Removed assigned services section from create staff member page per user request
  - Updated form schema to exclude service assignment fields and functions
  - Fixed username generation logic with timestamp-based uniqueness
  - Streamlined staff creation process to focus on essential information only
  - Staff creation now working properly with permanent database storage

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