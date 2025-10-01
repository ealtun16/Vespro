# Vespro - Industrial Tank Cost Analysis System

## Overview

Vespro is a comprehensive web application designed for managing and analyzing industrial tank cost reports. The system specializes in handling cost analysis data for various types of industrial tanks including Storage Tanks, Pressure Vessels, and Heat Exchangers. The application provides dual input modes: a form-based tank specifications interface with preliminary cost calculation, and an AI-powered chat assistant for natural language queries. The system integrates with n8n ChatGPT agents for intelligent cost analysis and project recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

**Transform to "Form + Chat" Tool with n8n Agent Integration**

The system is undergoing a major transformation to add AI-powered chat capabilities alongside the existing form-based workflow:

### Completed Infrastructure (Tasks 1-5)
1. **Database Schema Extensions**: Added `chat_sessions` and `chat_messages` tables with proper relationships. Extended settings table with n8n agent configuration fields (endpoint, API key). Implemented SafeSettings type to prevent API key exposure to frontend.

2. **n8n Agent Service**: Created `server/agent.ts` with configurable HTTP integration supporting X-N8N-API-KEY headers. Implements retry logic with exponential backoff (1s base, 10s cap with jitter), retries on 5xx/429/network errors, and proper timeout cleanup with finally blocks.

3. **Storage Layer Updates**: Added CRUD operations for chat sessions and messages. Implemented SafeSettings protection pattern where `getSettings()` returns sanitized data for client while `getSettingsWithApiKey()` provides full settings for server-only use. Added ordering by creation time for message history.

4. **API Routes**: Three new endpoints with Zod validation:
   - `POST /api/agent/chat`: Interactive chat with context awareness
   - `POST /api/agent/analyze`: Tank specification analysis
   - `POST /api/analysis/estimate`: Preliminary cost estimation
   All routes sanitize upstream errors (502 for agent failures) and map HTTP status codes appropriately.

5. **Navigation Structure**: Updated sidebar with five sections:
   - Dashboard (/)
   - Tank Analysis (/tank-analysis) - Form-based entry
   - Chat (/chat) - Ask the Agent interface  
   - Reports (/reports) - Existing reports view
   - Settings (/settings) - API configuration

### Remaining Work (Tasks 6-10)
- Task 6: Implement Tank Analysis page with validated form → price estimate → agent analysis → persistence
- Task 7: Implement Chat page with session management and message history
- Task 8: Enhance Records/Reports page with analysis history, implement Settings page for n8n configuration
- Task 9: Extract Excel overlay modal for reuse across pages
- Task 10: End-to-end testing and flow validation

### Security Architecture
- **API Key Protection**: n8nApiKey never exposed to frontend; SafeSettings type enforced across all client-facing APIs
- **Error Sanitization**: Upstream agent errors transformed to generic 502 responses
- **Input Validation**: All API endpoints validate with Zod schemas before processing
- **SSRF Awareness**: n8n endpoint configuration requires future auth/authorization controls

## System Architecture

### Frontend Architecture
The client-side is built as a single-page application using React with TypeScript. The application leverages modern React patterns including functional components with hooks and utilizes Wouter for lightweight client-side routing. The UI is constructed with shadcn/ui components built on top of Radix UI primitives, providing a consistent and accessible design system. TanStack Query handles server state management and caching, while React Hook Form manages form state and validation with Zod schemas.

### Backend Architecture
The server follows a REST API architecture built with Express.js and TypeScript. The application uses ESM modules throughout for modern JavaScript standards. The server implements middleware for request logging, JSON parsing, and error handling. Route handlers are organized separately from the main server file for better maintainability, with dedicated storage layer abstraction for database operations.

### Database Design
The system uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The schema includes four main entities: users for authentication, tank specifications for technical details, cost analyses for financial data, and materials for component costs. The database supports complex relationships between tank specifications and their associated cost analyses, with detailed material breakdowns through junction tables.

### Component Organization
The frontend follows a structured component hierarchy with reusable UI components, specialized layout components for navigation and page structure, and feature-specific components for data tables and forms. The shadcn/ui design system provides consistent styling through CSS variables and Tailwind CSS utilities, enabling theme customization and responsive design.

### File Upload and Processing
The system implements Excel file processing capabilities using the XLSX library for parsing spreadsheet data. File uploads are handled through multer middleware with memory storage, supporting validation for file types and size limits. The application can process complex Excel structures containing tank specifications and cost analysis data.

**Multi-Sheet Upload Support**: The system now processes all sheets in an Excel workbook, creating separate tank orders for each sheet. Each sheet upload is tracked with metadata including sheet_name, sheet_index, source_kind (excel/manual), and source_filename. The upload process supports partial success scenarios where some sheets may fail while others succeed. Results are aggregated and reported to the user with detailed counts of successful and failed sheets. The frontend displays a toast notification showing the upload results and automatically opens a modal to preview the first successfully processed sheet. Excel files are stored in the `/uploads` directory with original filenames for later retrieval and preview.

### State Management Strategy
Client state is managed through a combination of TanStack Query for server state, React Hook Form for form state, and local React state for UI interactions. The query client is configured with appropriate defaults for caching and refetching behavior, optimizing performance for data-heavy operations.

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL for cloud hosting
- **Drizzle ORM**: Type-safe database operations with schema-first approach
- **Database Connection**: Utilizes connection pooling through @neondatabase/serverless

### UI and Styling Framework
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Low-level UI primitives for accessibility and functionality
- **Lucide React**: Icon library for consistent iconography

### File Processing
- **XLSX**: Excel file parsing and generation for data import/export
- **Multer**: File upload handling middleware for Express

### Form Management and Validation
- **React Hook Form**: Form state management with performance optimization
- **Zod**: Schema validation for type safety and runtime validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### Development Tools
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### Query and State Management
- **TanStack Query**: Server state management with caching and synchronization
- **Date-fns**: Date manipulation and formatting utilities

### Additional Utilities
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **CLSX**: Conditional CSS class name utility
- **Nanoid**: URL-safe unique string ID generator