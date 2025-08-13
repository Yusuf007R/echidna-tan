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
import { InteractionContext } from "@Structures/interaction-context";

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

// Discord.js imports (only when needed for specific types)
import type { Message, EmbedBuilder } from "discord.js";
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
  
  async run(): Promise<void> {
    // Use InteractionContext methods directly
    await InteractionContext.deferReply(); // If needed
    await InteractionContext.editReply("Response message");
    
    // Access user info
    const user = InteractionContext.user;
    
    // Access options
    const value = this.options.optionName;
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

## InteractionContext Usage

### Key Methods
```typescript
// Defer the reply (use when command takes time)
await InteractionContext.deferReply();

// Send or edit replies
await InteractionContext.sendReply("Message");
await InteractionContext.editReply("Updated message");
await InteractionContext.editReply({ embeds: [embed] });

// Access user information
const user = InteractionContext.user;
const userId = InteractionContext.user.id;

// Send follow-up messages
await InteractionContext.followUp("Follow-up message");
```

### Important Notes
- InteractionContext is automatically initialized by the interaction manager
- No need to wrap commands in `InteractionContext.run()`
- Commands should NOT have interaction parameters in their `run()` methods
- Use InteractionContext methods directly instead of interaction.reply()
- The interaction parameter is handled internally by the framework

