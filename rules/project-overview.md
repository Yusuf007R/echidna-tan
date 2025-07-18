# Echidna-tan Project Overview

## Project Overview

Echidna-tan is a full-stack Discord bot with AI integration:


## Development Commands

### Bot Development
- `cd bot && pnpm dev` - Development server with watch mode (includes type-check and formatting)
- `cd bot && pnpm build` - Build for development
- `cd bot && pnpm build:prod` - Build for production  
- `cd bot && pnpm start` - Build and run the bot
- `cd bot && pnpm check` - Run type-check, format, and lint (full validation)
- `cd bot && pnpm type-check` - TypeScript type checking only
- `cd bot && pnpm lint` - Biome linter with auto-fix
- `cd bot && pnpm format` - Biome formatter

### Frontend Development
- `cd front && pnpm dev` - Start frontend development server
- `cd front && pnpm build` - Build frontend for production
- `cd front && pnpm start` - Start production frontend server

### Database Operations (Bot)
- `cd bot && pnpm db:generate` - Generate Drizzle migrations
- `cd bot && pnpm db:migrate` - Apply migrations to database
- `cd bot && pnpm db:studio` - Open Drizzle Studio GUI
- `cd bot && pnpm db:clear` - Clear database

## Code Style
- **Files**: `kebab-case.ts/tsx`
- **Classes**: `PascalCase`
- **Variables/Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Imports**: Path aliases (`@Structures`, `@Managers`, etc.)
- **Error Handling:** Always wrap async operations in try/catch
- **Comments:** Explain *why*, not *what*

## Key Patterns
- **Bot Commands**: Extend `Command` base class with `OptionsBuilder`
- **State Management**: Singleton pattern via `EchidnaSingleton` - never instantiate managers
- **Database**: Single schema file, access via `db` import
- **AI Features**: Tools extend `Tool` base class, personalities in templates