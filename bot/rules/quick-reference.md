# Quick Reference Guide

## Essential File Locations

### Core Structure Files
- **Main Entry:** `src/index.ts`
- **Client Extension:** `src/structures/echidna-client.ts`
- **Base Command:** `src/structures/command.ts`
- **Base Context Menu:** `src/structures/context-menu.ts`
- **Base Event:** `src/structures/discord-events.ts`
- **Base Tool:** `src/structures/tool.ts`

### Configuration & Schema
- **Database Schema:** `src/drizzle/schema.ts`
- **Database Client:** `src/drizzle/index.ts`
- **App Config:** `src/config/index.ts`
- **Options Builder:** `src/utils/options-builder.ts`

### Import Statements
```typescript
// Command imports
import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import IsAdmin from "@EventsValidators/isAdmin";

// Context menu imports
import ContextMenu from "@Structures/context-menu";

// Event imports
import { DiscordEvent } from "@Structures/discord-events";

// AI imports
import { Tool, type ToolResult } from "@Structures/tool";
import type { AiRpPrompt } from "@Interfaces/ai-prompts";

// Database imports
import { db } from "@Drizzle/index";
import { users, guilds } from "@Drizzle/schema";

// Discord.js imports
import type { CommandInteraction, CacheType } from "discord.js";
```

### Quick Class Signatures
```typescript
// Command class
export default class MyCommand extends Command<typeof options> {
  constructor() {
    super({
      name: "command-name",
      description: "Command description",
      options,
      cmdType: "BOTH", // "GUILD", "DM", "BOTH"
      shouldDefer: true,
      validators: [IsAdmin], // Optional
    });
  }
  
  async run(interaction: CommandInteraction<CacheType>): Promise<void> {
    // Implementation
  }
}

// Context menu class
export default class MyContextMenu extends ContextMenu<"MESSAGE"> {
  constructor() {
    super({
      name: "Menu Name",
      description: "Menu description",
      type: "MESSAGE", // or "USER"
      cmdType: "GUILD",
    });
  }
  
  async run(interaction: MessageContextMenuCommandInteraction) {
    // this.target is the message
  }
}

// Event class
export default class MyEvent extends DiscordEvent<"messageCreate"> {
  constructor() {
    super({
      eventName: "messageCreate",
      eventType: "on", // or "once"
    });
  }
  
  async run(message: Message) {
    // Event handling
  }
}
```

