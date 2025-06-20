import config from "@Configs";
import type { AiPrompt } from "@Interfaces/ai-prompts";
import type { OpenRouterModel } from "@Interfaces/open-router-model";
import ChatBotManager from "@Managers/chat-bot-manager";
import { openAI } from "@Utils/request";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type CoreMessage, generateText, tool } from "ai";
import { desc, eq, type InferSelectModel, sql } from "drizzle-orm";
import db from "src/drizzle";
import {
	chatsTable,
	memoriesTable,
	messagesTable,
	type userTable,
} from "src/drizzle/schema";
import z from "zod";

const openrouter = createOpenRouter({
	apiKey: config.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = (chatbotName: string, userName: string) => `
You are a specialized memory extraction and management system. Your primary goal is to identify, save, and update important user information from conversations to enhance future interactions. You will use the provided tools to manage these memories.

CONTEXT: This is a conversation between chatbot: ${chatbotName} and user: ${userName}.

CRITICAL INSTRUCTION - MEMORY PROCESSING WORKFLOW:
Your task is to meticulously analyze the chat history. For EACH distinct piece of potentially valuable information shared by the user, follow this precise workflow:

1.  **IDENTIFY POTENTIAL INFORMATION:**
    *   Pinpoint specific details, preferences, facts, goals, or significant statements made by the user.
    *   Focus on information that offers lasting value for personalization and understanding the user better.

2.  **FORMULATE CONCISE, ATOMIC MEMORIES:**
    *   Each piece of information MUST be formulated as a concise, factual, and standalone sentence.
    *   If a user statement contains multiple distinct facts, break them down into SEPARATE concise memories.
    *   **Examples of concise, atomic memories:**
        *   If user says: "I enjoy reading fantasy novels, and my favorite author is Brandon Sanderson."
            *   Potential memory 1: "User enjoys reading fantasy novels."
            *   Potential memory 2: "User's favorite author is Brandon Sanderson."
        *   If user says: "I'm a graphic designer, I work remotely, and I have a cat named Luna."
            *   Potential memory 1: "User is a graphic designer."
            *   Potential memory 2: "User works remotely."
            *   Potential memory 3: "User has a cat named Luna."

3.  **FOR EACH POTENTIAL CONCISE MEMORY, EXECUTE THE FOLLOWING:**
    a.  **SEARCH for Duplicates or Related Existing Memories:**
        *   Use the \`search-memory\` tool. To effectively use embedding-based search, the query you provide to this tool should be the *single, concise potential memory statement* you have just formulated and are currently evaluating. This allows the search to find existing memories that are semantically very similar to the new potential memory.
        *   **Correct Query Example:** If your potential concise memory is "User enjoys reading fantasy novels," your search query for the \`search-memory\` tool should be exactly: \`"User enjoys reading fantasy novels."\`
        *   **Another Query Example:** If your potential concise memory is "User's cat is named Whiskers," your search query should be: \`"User's cat is named Whiskers."\`
        *   The \`search-memory\` tool will return relevant existing memories (based on semantic similarity to your query statement), each including its \`memoryId\`.
        *   Carefully examine ALL search results.

    b.  **DECIDE AND ACT (Update, Save, or Do Nothing for THIS specific concise memory):**
        *   **PRIORITY 1: EXACT DUPLICATE:** If the \`search-memory\` tool returns an existing memory that conveys the *exact same information* (or a trivial variation) as your current concise potential memory, **DO NOTHING** for this potential memory and move to the next.
        *   **PRIORITY 2: UPDATE EXISTING MEMORY:** If the new concise memory *clearly and directly supersedes, corrects, or significantly modifies an existing memory* found via \`search-memory\`, OR if the new memory provides a more **permanent or foundational piece of information** that makes an existing, more **dynamic or derived memory** (like a current age) less precise, complete, or potentially outdated:
            *   Use the \`update-memory\` tool. Provide the \`memoryId\` (obtained from the \`search-memory\` result) of the *old* memory and the \`newMemory\` content (which is your new concise memory).
            *   **Only update if the new information REPLACES, is a DIRECT EVOLUTION of, or provides a more STABLE FOUNDATION for the old information for the SAME ENTITY (e.g., the user, user's pet).**
            *   Example (Superseding): User says, "I used to prefer coffee, but now I only drink tea." (Potential new memory: "User only drinks tea.") If \`search-memory\` (query: \`"User only drinks tea."\`) finds "User prefers coffee (ID: 123)," you would call \`update-memory(memoryId: 123, newMemory: "User only drinks tea.")\`.
            *   Example (More Stable/Foundational Fact): User says, "My girlfriend was born in 2004." (Potential new memory: "User's girlfriend was born in 2004.") If \`search-memory\` (query: \`"User's girlfriend was born in 2004."\`) finds "User's girlfriend is 20 years old (ID: 456)" (assuming current year 2024/2025), you should call \`update-memory(memoryId: 456, newMemory: "User's girlfriend was born in 2004.")\` because the birth year is a more stable and foundational piece of information than a calculated current age for the same entity (the girlfriend).
            *   Example (Correction): User says, "Actually, my appointment is at 3 PM, not 2 PM." (Potential new memory: "User's appointment is at 3 PM.") If \`search-memory\` (query: \`"User's appointment is at 3 PM."\`) finds "User's appointment is at 2 PM (ID: 789)," you would call \`update-memory(memoryId: 789, newMemory: "User's appointment is at 3 PM.")\`.
        *   **PRIORITY 3: SAVE NEW MEMORY:** If the concise memory is genuinely new, not a duplicate (after checking \`search-memory\` results), and doesn't qualify as a direct update to a *specific* existing memory according to the criteria above:
            *   Use the \`save-memory\` tool with the new concise memory.
            *   Example: User says "I also enjoy cats," (leading to a potential new memory "User enjoys cats."). If \`search-memory\` (query: \`"User enjoys cats."\`) does not find a direct duplicate or updatable memory like "User dislikes cats" but perhaps finds "User likes dogs (ID: 456)," you would save "User enjoys cats." as a new memory.

CRITICAL INSTRUCTIONS - TOOL USAGE & DECISION MAKING:
*   **Process One Fact at a Time:** Apply the full IDENTIFY-FORMULATE-SEARCH-DECIDE-ACT workflow for each individual piece of information before moving to the next.
*   **Mandatory Search:** ALWAYS use \`search-memory\` for each potential new concise memory before deciding to \`save-memory\` or \`update-memory\`. The query for \`search-memory\` should be the potential memory statement itself.
*   **Purpose of \`update-memory\`:** This tool is for correcting or evolving existing specific facts, or replacing dynamic/derived facts with more stable/foundational ones for the same entity. It is not for adding related but distinct new information about different aspects or different entities.
*   **Memory IDs from Search:** The \`search-memory\` tool is your source for \`memoryId\`s. Use these IDs accurately when calling \`update-memory\`.
*   **Preference for Stable Information:** When information about age is involved, prefer saving/updating with a birth year or specific birth date if available for an entity, as this is more stable than a current age which changes over time. For example, "User was born in 1990" is preferred over "User is 34 years old." if both refer to the user's age.
*   **No Action:** If, after analysis, no memory needs to be saved or updated (e.g., all information is trivial or already exists as per search results), do not call any tools.

WHAT TO SAVE (as concise, atomic memories that provide long-term value):
✓   **Core Personal Details:** Name (if shared explicitly), specific location (city/country if volunteered as a stable fact), primary occupation, birth year/date (preferred over current age).
✓   **Strong & Specific Preferences/Dislikes:** Clearly stated favorite things, strong dislikes (e.g., "User loves hiking in mountains," "User dislikes pineapple on pizza"). Be specific.
✓   **Significant Life Events & Enduring Experiences:** Major milestones shared with importance (e.g., "User completed a marathon," "User studied abroad in Japan").
✓   **Concrete Goals & Aspirations:** Clearly stated long-term personal or professional goals (e.g., "User wants to learn Spanish," "User is planning to write a novel").
✓   **Key Relationships & Pets (Names if given):** e.g., "User has a dog named Perry." "User mentioned their spouse, Alex." Include birth years/dates for pets/relations if provided.
✓   **Recurring, Specific Hobbies & Interests:** If the user frequently details a specific hobby (e.g., "User is learning to play the guitar," "User collects vintage stamps").

WHAT NOT TO SAVE (or update):
✗   **Temporary States/Moods:** "I'm hungry," "I feel happy today."
✗   **Trivial/Obvious Details:** "I am using a computer."
✗   **Casual Small Talk/Fleeting Comments:** "The weather is okay," "That's interesting" (without further personal elaboration).
✗   **General Knowledge or Opinions Not Specific to User's Core Identity/Preferences:** Generic statements about the world.
✗   **Highly Repetitive Information:** If \`search-memory\` confirms a fact is already accurately captured (and the new information isn't a more stable/foundational version of it), do not re-save or trivially update.
✗   **Vague or Unclear Statements:** "I like some things," "I might do that later."
✗   **Information already accurately existing (confirmed via \`search-memory\`) unless it's a clear, direct update or a more foundational version of an existing fact as defined above.**

Your sole purpose is memory extraction and management. You MUST use the provided tools for any memory operations. Do not output any other text or direct responses to the user. If no tool call is warranted for the current user message, output no tool calls.`;

export default class MemoriesManager {
	NUMBER_OF_MESSAGES_TO_PROCESS = 10;
	MODEL_NAME = "openai/gpt-4.1";
	model: OpenRouterModel | undefined;
	constructor(
		private chat: InferSelectModel<typeof chatsTable>,
		private user: InferSelectModel<typeof userTable>,
		private prompt: AiPrompt,
	) {}

	private async insertMemories(memory: string) {
		const embed = await openAI.embeddings.create({
			model: "text-embedding-3-small",
			input: memory,
		});

		const embeddings = embed.data.at(0)?.embedding;
		if (!embeddings) return;

		await db.insert(memoriesTable).values({
			userId: this.chat.userId,
			memory: memory,
			importance: 0.5,
			memoryType: "user",
			embeds: embeddings,
			promptTemplate: this.chat.promptTemplate,
		});
	}

	async messagesProcessor(
		dbMessages: InferSelectModel<typeof messagesTable>[],
	) {
		try {
			const messages = [
				{
					role: "system",
					content: SYSTEM_PROMPT(this.prompt.name, this.user.displayName),
				},
				...dbMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				})),
			] as CoreMessage[];
			const response = await generateText({
				model: openrouter(this.MODEL_NAME),
				maxSteps: 10,
				toolChoice: "auto",
				messages,
				tools: {
					"save-memory": tool({
						description: `
							Use this tool to save an important piece of information as a memory.
							be saving a memory, check if it is a duplicate or if it is a new memory.
						`,
						parameters: z.object({
							memory: z.string().describe("The memory to save"),
						}),
						execute: async ({ memory }) => {
							console.log("Saving memory", memory);
							await this.insertMemories(memory);
							return "Memory saved";
						},
					}),
					"search-memory": tool({
						description: `
							Use this tool to search for a memory.
							use it to search for duplicate memories.
						`,
						parameters: z.object({
							query: z.string().describe("The query to search for."),
						}),
						execute: async ({ query }) => {
							console.log("Searching for memory", query);
							const memories = await this.retrieveMemories(query);
							const text = memories.reduce((acc, memory) => {
								let a = acc;
								a += `
									ID: ${memory.id}\n
									Memory: ${memory.memory}\n
									Date: ${memory.date}\n\n
								`;
								return a;
							}, "");
							console.log("Search result", text);
							return text;
						},
					}),
					"update-memory": tool({
						description: `
						Use this tool to update a memory.
						use it to update an old memory with new information.
						`,
						parameters: z.object({
							memoryId: z.number().describe("The id of the memory to update."),
							newMemory: z.string().describe("The new memory."),
						}),
						execute: async ({ memoryId, newMemory }) => {
							console.log("Updating memory", memoryId, newMemory);
							await this.updateMemory(memoryId, newMemory);
							return "Memory updated";
						},
					}),
				},
			});
			console.log("Response", response.text);
		} catch (error) {
			console.error("Error", error);
			return [];
		}
	}

	async retrieveMemories(messages: string) {
		const embed = await openAI.embeddings.create({
			model: "text-embedding-3-small",
			input: messages,
		});
		const embeddings = embed.data.at(0)?.embedding;
		if (!embeddings) return [];

		const topMemories = await db
			.select({
				id: memoriesTable.id,
				memory: memoriesTable.memory,
				date: memoriesTable.createdAt,
			})
			.from(
				sql`vector_top_k('vector_memories_embeds', vector32(${JSON.stringify(embeddings)}), 3) as v`,
			)
			.leftJoin(memoriesTable, sql`${memoriesTable}.rowid = v.id`)
			.where(eq(memoriesTable.userId, this.user.id));

		return topMemories;
	}

	async getChatMessages() {
		const chat = await db.query.chatsTable.findFirst({
			where: eq(chatsTable.id, this.chat.id),
			with: {
				messages: {
					where: eq(messagesTable.wasMemoryProcessed, false),
					orderBy: desc(messagesTable.createdAt),
				},
			},
		});
		if (!chat) throw new Error("[MemoriesManager] Chat not found");
		return chat;
	}

	async updateMemory(memoryId: number, newMemory: string) {
		await db
			.update(memoriesTable)
			.set({ memory: newMemory })
			.where(eq(memoriesTable.id, memoryId));
	}

	async loadModel() {
		if (this.model) return;
		const model = await ChatBotManager.getModel(this.MODEL_NAME);
		if (!model) throw new Error("[MemoriesManager] Model not found");
		this.model = model;
	}

	async manageMemory() {
		await this.loadModel();
		console.log("Starting memory management");
		const chat = await this.getChatMessages();
		console.log(`Chat messages: ${chat.messages.length}`);
		if (chat.messages.length < this.NUMBER_OF_MESSAGES_TO_PROCESS) return;
		console.log("Checking for memories");
		await this.messagesProcessor(chat.messages.reverse());

		await db
			.update(messagesTable)
			.set({ wasMemoryProcessed: true })
			.where(
				sql`${messagesTable.id} IN (${chat.messages.map((msg) => msg.id).join(",")})`,
			);
	}
}
