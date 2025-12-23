# Arena Sports

## Overview

Arena Sports is a modern SaaS platform for managing sports courts and athletic complexes. It's a B2B/B2C solution designed to eliminate the hassle of scheduling sports courts through spreadsheets and lengthy WhatsApp conversations.

The platform serves two main user types:

- **Admins (Court Owners)**: A complete dashboard to manage schedules, view occupancy, approve bookings, and track revenue
- **Players (End Users)**: A fast, public booking interface to check availability and make reservations

The application is currently frontend-only with mock data, designed to be extended with a backend and database.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (December 2024)

### Mobile-First UX Improvements

- **AdminLayout**: Fixed compact mobile header (h-14) with persistent hamburger menu, reduced padding (px-3/py-3 mobile, md:p-6/p-8 desktop)
- **AgendaMaster**: Responsive header (flex-col md:flex-row), compact cards (p-3 md:p-4), visible Aprovar/Rejeitar buttons on mobile via grid-cols-1 md:grid-cols-2
- **Dashboard**: Responsive gaps (gap-3 md:gap-4), KPI cards with mobile-first layout
- **FinanceiroView**: Responsive header and filters (flex-col md:flex-row), full-width buttons on mobile
- **FolgasView**: Responsive header with stacked layout on mobile, full-width action button

### Design Patterns Applied

- Typography: text-xl md:text-3xl headings, text-xs md:text-sm descriptions
- Spacing: space-y-4 md:space-y-6, gap-2 md:gap-4
- Buttons: w-full md:w-auto for responsive width
- Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for responsive layouts
- Flex: flex-col md:flex-row for mobile-first stacking

## System Architecture

### Frontend Architecture

- **React 18 with TypeScript**: Core UI library with type safety
- **Vite**: Build tool for fast development and optimized production builds
- **React Router DOM**: Client-side routing with protected admin routes and public booking routes
- **TanStack React Query**: Server state management (prepared for future API integration)

### Route Structure

- `/admin/login` - Admin authentication page
- `/admin/dashboard` - Protected admin panel
- `/agendar` - Public booking interface for players
- Legacy routes redirect appropriately (`/` → admin login, `/user` → `/agendar`)

### UI Component System

- **Tailwind CSS**: Utility-first styling with custom dark theme
- **Shadcn/UI**: Radix-based accessible component library
- **Custom components**: Domain-specific components for bookings, time slots, and admin features
- **Dark theme by default**: Green accent color (HSL 135 100% 50%) with dark backgrounds

### State Management

- **React Context (BookingsContext)**: Centralized state for time slots and bookings
- **localStorage persistence**: Data persists between sessions using `arena_time_slots` and `arena_bookings` keys
- **Mock data initialization**: Pre-populated with sample time slots and bookings

### Key Design Patterns

- Component composition with TypeScript interfaces
- Centralized configuration (`src/config/arena.ts`) for easy customization of arena name, fields, pricing, and contact info
- Shared type definitions (`src/types/booking.ts`) for consistency
- Path aliases (`@/`) for clean imports

### Data Flow

1. Mock data generates 30 days of time slots for multiple fields
2. BookingsContext manages all state changes
3. Components consume context via `useBookings` hook
4. Changes automatically persist to localStorage

## External Dependencies

### Core Libraries

- **date-fns**: Date manipulation and formatting with Portuguese (Brazil) locale
- **lucide-react**: Icon library
- **class-variance-authority + clsx + tailwind-merge**: Styling utilities
- **vaul**: Drawer component for mobile-friendly modals

### UI Components (Radix UI)

- Dialog, Dropdown Menu, Select, Popover, Toast, Tabs, Switch, Progress, and many more
- All wrapped by Shadcn/UI for consistent styling

### Form Handling

- **react-hook-form + @hookform/resolvers**: Form state and validation
- **zod** (implied by resolvers): Schema validation

### Third-Party Integrations (Configured but not fully implemented)

- **WhatsApp**: Contact links for support and mensalista (monthly subscriber) inquiries
- **Pix payments**: Brazilian instant payment system (mock implementation with QR code generation)
- **Vercel**: Deployment configuration with SPA rewrites

### Development Tools

- **ESLint with TypeScript**: Code quality (relaxed rules for flexibility)
- Component tagging tool removed for production
