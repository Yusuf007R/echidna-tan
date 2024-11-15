import ChatBot from '@AiStructures/chat-bot';
import ChatBotManager from '@Managers/chat-bot-manager';
import { Command } from '@Structures/command';
import { OptionsBuilder } from '@Utils/options-builder';
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  User
} from 'discord.js';
import { eq } from 'drizzle-orm';
import db from 'src/drizzle';
import { usersTable } from 'src/drizzle/schema';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'model',
    description: 'Name of the model',
    required: false,
    autocomplete: true
  })
  .addStringOption({
    name: 'prompt',
    description: 'Prompt to use',
    required: false,
    autocomplete: true
  })
  .build();

const getUser = async (user: User) => {
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.discordId, user.id)).limit(1);
  if (!dbUser) {
    const insertUser = (
      await db
        .insert(usersTable)
        .values({
          discordId: user.id,
          displayName: user.displayName,
          userName: user.username
        })
        .returning()
    ).at(0);
    if (!insertUser) throw new Error('Internal error, try again later.');
    return insertUser;
  }
  return dbUser;
};

export default class CreateChatCommand extends Command<typeof options> {
  constructor() {
    super({
      name: 'create-chat',
      description: 'Create a chat instance with a bot',
      cmdType: 'BOTH',
      shouldDefer: true,
      options,
      validators: []
    });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
    const option = this.options.focused;
    if (!option) return;
    const choices: ApplicationCommandOptionChoiceData[] = [];
    switch (option.name) {
      case 'model':
        {
          const modelList = await ChatBotManager.getModelList(option.value);

          choices.push(...modelList.slice(0, 8).map((model) => ({ name: model.name, value: model.id })));
        }
        break;
      case 'prompt':
        {
          const prompts = ChatBotManager.getPromptsTemplates();
          const filtered = prompts
            .filter((prompt) => {
              if (!option.value) return true;
              return JSON.stringify(prompt).toLowerCase().includes(option.value.toLowerCase());
            })
            .slice(0, 8);
          choices.push(
            ...filtered.map((prompt) => ({ name: prompt.promptTemplate.name, value: prompt.promptTemplate.name }))
          );
        }
        break;
      default:
        break;
    }

    try {
      await interaction.respond(choices);
    } catch (error) {
      console.log(error);
    }
    return choices;
  }

  async run(interaction: ChatInputCommandInteraction<CacheType>) {
    const user = await getUser(interaction.user);
    if (!user) throw new Error('Internal error, try again later.');
    const channel = interaction.channel;

    if (channel?.type !== ChannelType.GuildText) {
      await interaction.editReply('This command can only be used in text channels.');
      return;
    }
    const modelId = this.options.model || 'google/gemini-flash-1.5';
    const model = await ChatBotManager.getModel(modelId);

    if (!model) throw new Error('model not found');

    const promptName = this.options.prompt || 'Assistant';

    const prompt = ChatBotManager.getPromptsTemplates().find((prompt) => prompt.promptTemplate.name === promptName);

    if (!prompt) throw new Error('prompt not found');

    const thread = await channel.threads.create({
      name: model.name
    });

    const chatbot = new ChatBot(thread, model, user, prompt.promptTemplate);
    const collector = thread.createMessageCollector();

    collector.on('collect', (m) => {
      chatbot.processMessage(m);
    });
    interaction.editReply('New chatbot in thread created');
  }
}
