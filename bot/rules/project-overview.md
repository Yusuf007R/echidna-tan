# Discord Bot Project Overview

## Project Architecture

This is a Discord bot built with TypeScript, discord.js v14, and AI integration through OpenRouter.

### Core Technologies
- **Discord Framework:** discord.js v14
- **Database:** Drizzle ORM with Turso (libsql)
- **API Server:** Hono framework
- **AI Integration:** OpenRouter.ai with multiple model support
- **Build Tool:** esbuild
- **Code Quality:** Biome (linting/formatting)

## Project Structure
```
src/
├── index.ts                    # Main entry point - initializes EchidnaClient
├── api/                        # Hono web server code
│   ├── routers/               # Individual route files
│   └── middlewares/           # Hono middleware
├── ai-stuff/                  # All AI feature logic
│   ├── structures/            # Core AI classes (ChatBot, MemoriesManager)
│   ├── templates/             # AI personalities and system prompts
│   └── tools/                 # AI agent tools (like EchidnaSelfieTool)
├── commands/                  # Discord slash commands (organized by category)
├── context-menu/              # Discord context menu commands
├── drizzle/                   # Database configuration
│   ├── schema.ts              # Single source of truth for database tables
│   └── index.ts               # Database client export
├── events/                    # Discord.js event handlers
├── event-validators/          # Pre-validation system (IsAdmin, GuildOnly)
├── managers/                  # Singleton classes for global state
├── structures/                # Core application classes and abstractions
│   ├── echidna-client.ts      # Main Client extension
│   ├── command.ts             # Base class for all slash commands
│   ├── context-menu.ts        # Base class for all context menus
│   └── discord-events.ts      # Base class for all event handlers
└── utils/                     # Standalone utility functions
```

## Development Patterns

### Commands
All slash commands must extend `Command` class and use `OptionsBuilder`:
- **Example:** `src/commands/anime/search-anime.ts`
- **Location:** Organize by category in `src/commands/`
- **Special Case:** Music commands extend `MusicCommand` from `./[wrapper].ts`

### Context Menus
All context menus must extend `ContextMenu` class:
- **Example:** `src/context-menu/tmdb/delete-note.ts`
- **Types:** `"USER"` or `"MESSAGE"`

### Event Handlers
All event handlers must extend `DiscordEvent` class:
- **Example:** `src/events/message-create.ts`
- **Event Types:** Use `"on"` for recurring events, `"once"` for one-time events

### AI Features
- **Personalities:** Define in `src/ai-stuff/templates/` following `AiRpPrompt` interface
- **Tools:** Create in `src/ai-stuff/tools/` extending `Tool` base class
- **Example:** `src/ai-stuff/tools/echidna-selfies.ts`

### Database Operations
- **Schema:** All tables defined in `src/drizzle/schema.ts`
- **Access:** Use `db` client from `src/drizzle/index.ts`
- **Migrations:** Handled by drizzle-kit

### State Management
- **Singleton Pattern:** All managers accessed via `this.echidna.*`
- **Never Instantiate:** Use inherited `EchidnaSingleton` base class
- **Available Managers:** `musicPlayer`, `guildsManager`, `interactionManager`, etc.

## Quick Reference Examples
- **Command Example:** `src/commands/music/play.ts`
- **Context Menu Example:** `src/context-menu/tmdb/edit-note.ts`
- **Event Handler Example:** `src/events/interaction-event.ts`
- **AI Tool Example:** `src/ai-stuff/tools/echidna-selfies.ts`
- **Manager Example:** `src/managers/interaction-manager.ts`
- **Utility Example:** `src/utils/options-builder.ts`
