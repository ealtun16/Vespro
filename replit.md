# Vespro - Industrial Tank Cost Analysis System

## Overview

Vespro is a comprehensive web application designed for managing and analyzing industrial tank cost reports. The system specializes in handling cost analysis data for various types of industrial tanks including Storage Tanks, Pressure Vessels, and Heat Exchangers. It provides functionality for importing Excel data, managing tank specifications, performing cost analysis, and generating reports for industrial tank projects.

## User Preferences

Preferred communication style: Simple, everyday language.

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