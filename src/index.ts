import { defineHook } from "@directus/extensions-sdk";
import { z } from "zod";
import type { HookExtensionContext } from "@directus/types";

// Input validation schemas using Zod
const createPresetSchema = z.object({
	action: z.literal("create"),
	collection: z.string().describe("The collection this preset applies to").optional(),
	bookmark: z.string().describe("The name of the bookmark").optional(),
	layout: z.string().describe("The layout to use (tabular, cards, calendar, etc.)").optional(),
	layout_query: z.record(z.any()).describe("Layout-specific query parameters").optional(),
	layout_options: z.record(z.any()).describe("Layout-specific options").optional(),
	search: z.string().describe("Search query").optional(),
	filter: z.record(z.any()).describe("Filter rules").optional(),
	icon: z.string().describe("Icon for the bookmark").optional(),
	color: z.string().describe("Color for the bookmark").optional(),
	role: z.string().describe("Role ID for role-specific preset").optional().nullable(),
	user: z.string().describe("User ID for user-specific preset").optional().nullable(),
});

const readPresetsSchema = z.object({
	action: z.literal("read"),
	collection: z.string().describe("Filter by collection").optional(),
	role: z.string().describe("Filter by role ID").optional().nullable(),
	user: z.string().describe("Filter by user ID").optional().nullable(),
	limit: z.number().describe("Maximum number of presets to return").optional(),
});

const updatePresetSchema = z.object({
	action: z.literal("update"),
	id: z.union([z.string(), z.number()]).describe("The preset ID to update"),
	collection: z.string().describe("The collection this preset applies to").optional(),
	bookmark: z.string().describe("The name of the bookmark").optional(),
	layout: z.string().describe("The layout to use").optional(),
	layout_query: z.record(z.any()).describe("Layout-specific query parameters").optional(),
	layout_options: z.record(z.any()).describe("Layout-specific options").optional(),
	search: z.string().describe("Search query").optional(),
	filter: z.record(z.any()).describe("Filter rules").optional(),
	icon: z.string().describe("Icon for the bookmark").optional(),
	color: z.string().describe("Color for the bookmark").optional(),
});

const deletePresetSchema = z.object({
	action: z.literal("delete"),
	id: z.union([z.string(), z.number()]).describe("The preset ID to delete"),
});

const presetInputSchema = z.discriminatedUnion("action", [
	createPresetSchema,
	readPresetsSchema,
	updatePresetSchema,
	deletePresetSchema,
]);

type PresetInput = z.infer<typeof presetInputSchema>;

export default defineHook((_, context: HookExtensionContext) => {
	const { emitter, services, getSchema } = context;

	// Register the presets tool in the MCP tools list
	emitter.onFilter("mcp.tools.list", (tools) => {
		return [
			...tools,
			{
				name: "presets",
				annotations: {
					title: "Directus - Presets",
				},
				description: `Manage Directus presets (bookmarks, saved searches, and layout configurations).

Presets define the layout and filtering options for collections in Directus. They can be:
- **User presets**: Personal to a specific user
- **Role presets**: Shared across all users with a specific role
- **Global presets**: Available to all users (requires admin)

## Actions

- \`create\`: Create a new preset
- \`read\`: List presets (filtered by collection, role, or user)
- \`update\`: Modify an existing preset
- \`delete\`: Remove a preset

## Examples

### Create User Preset
\`\`\`json
{
  "action": "create",
  "collection": "articles",
  "bookmark": "My Drafts",
  "layout": "tabular",
  "filter": {
    "status": { "_eq": "draft" },
    "user_created": { "_eq": "$CURRENT_USER" }
  },
  "icon": "bookmark",
  "color": "#6366F1"
}
\`\`\`

### Create Role Preset
\`\`\`json
{
  "action": "create",
  "collection": "articles",
  "role": "role-uuid-here",
  "layout": "cards",
  "layout_options": {
    "size": "large"
  }
}
\`\`\`

### Read Presets for Collection
\`\`\`json
{
  "action": "read",
  "collection": "articles",
  "limit": 20
}
\`\`\`

### Update Preset
\`\`\`json
{
  "action": "update",
  "id": 123,
  "bookmark": "Updated Name",
  "filter": {
    "status": { "_eq": "published" }
  }
}
\`\`\`

### Delete Preset
\`\`\`json
{
  "action": "delete",
  "id": 123
}
\`\`\`

## Notes

- User and role fields control preset scope:
  - Both null = global preset (admin only)
  - User set = personal preset
  - Role set = role-wide preset
- Bookmarks appear in the sidebar navigation
- Layout options vary by layout type (tabular, cards, calendar, etc.)
- The table layout in Directus is called "tabular"
`,
				inputSchema: {
					type: "object",
					properties: {
						action: {
							type: "string",
							enum: ["create", "read", "update", "delete"],
							description: "The operation to perform",
						},
						id: {
							description: "The preset ID (required for update and delete)",
						},
						collection: {
							type: "string",
							description: "Collection name",
						},
						bookmark: {
							type: "string",
							description: "Bookmark name (appears in sidebar)",
						},
						layout: {
							type: "string",
							description: "Layout type (tabular, cards, calendar, etc.). Note: The table layout is called 'tabular' in Directus.",
						},
						layout_query: {
							type: "object",
							description: "Layout-specific query parameters",
						},
						layout_options: {
							type: "object",
							description: "Layout-specific display options",
						},
						search: {
							type: "string",
							description: "Search query string",
						},
						filter: {
							type: "object",
							description: "Filter rules using Directus filter syntax",
						},
						icon: {
							type: "string",
							description: "Icon identifier",
						},
						color: {
							type: "string",
							description: "Color (hex code)",
						},
						role: {
							type: "string",
							description: "Role ID for role-specific preset",
						},
						user: {
							type: "string",
							description: "User ID for user-specific preset",
						},
						limit: {
							type: "number",
							description: "Maximum number of presets to return (read action)",
						},
					},
					required: ["action"],
				},
			},
		];
	});

	// Handle presets tool execution
	emitter.onFilter("presets.mcp.tools.call", async (toolCall, meta) => {
		try {
			const input = presetInputSchema.parse(toolCall.arguments);
			const schema = await getSchema();
			const { PresetsService } = services;

			const presetsService = new PresetsService({
				schema,
				accountability: meta.accountability,
			});

			switch (input.action) {
				case "create": {
					// Build the preset object
					const presetData: Record<string, any> = {};

					// Add all optional fields if provided
					if (input.collection !== undefined) presetData.collection = input.collection;
					if (input.bookmark !== undefined) presetData.bookmark = input.bookmark;
					if (input.layout !== undefined) presetData.layout = input.layout;
					if (input.layout_query !== undefined) presetData.layout_query = input.layout_query;
					if (input.layout_options !== undefined) presetData.layout_options = input.layout_options;
					if (input.search !== undefined) presetData.search = input.search;
					if (input.filter !== undefined) presetData.filter = input.filter;
					if (input.icon !== undefined) presetData.icon = input.icon;
					if (input.color !== undefined) presetData.color = input.color;

					// Handle role and user (null is a valid value)
					if ("role" in input) presetData.role = input.role;
					if ("user" in input) presetData.user = input.user;

					const result = await presetsService.createOne(presetData);

					// Read back the created preset
					const preset = await presetsService.readOne(result, {
						fields: ["*"],
					});

					return {
						content: [
							{
								type: "text",
								text: `Preset created successfully with ID: ${result}`,
							},
							{
								type: "text",
								text: JSON.stringify(preset, null, 2),
							},
						],
					};
				}

				case "read": {
					// Build filter for reading presets
					const filter: Record<string, any> = {};

					if (input.collection) {
						filter.collection = { _eq: input.collection };
					}

					// Handle role filter (can be null)
					if ("role" in input) {
						if (input.role === null) {
							filter.role = { _null: true };
						} else {
							filter.role = { _eq: input.role };
						}
					}

					// Handle user filter (can be null)
					if ("user" in input) {
						if (input.user === null) {
							filter.user = { _null: true };
						} else {
							filter.user = { _eq: input.user };
						}
					}

					const presets = await presetsService.readByQuery({
						filter: Object.keys(filter).length > 0 ? filter : undefined,
						limit: input.limit || 100,
						sort: ["collection", "bookmark"],
						fields: ["*"],
					});

					return {
						content: [
							{
								type: "text",
								text: `Found ${presets.length} preset(s)`,
							},
							{
								type: "text",
								text: JSON.stringify(presets, null, 2),
							},
						],
					};
				}

				case "update": {
					// Build the update object
					const updateData: Record<string, any> = {};

					// Add all optional fields if provided
					if (input.collection !== undefined) updateData.collection = input.collection;
					if (input.bookmark !== undefined) updateData.bookmark = input.bookmark;
					if (input.layout !== undefined) updateData.layout = input.layout;
					if (input.layout_query !== undefined) updateData.layout_query = input.layout_query;
					if (input.layout_options !== undefined) updateData.layout_options = input.layout_options;
					if (input.search !== undefined) updateData.search = input.search;
					if (input.filter !== undefined) updateData.filter = input.filter;
					if (input.icon !== undefined) updateData.icon = input.icon;
					if (input.color !== undefined) updateData.color = input.color;

					await presetsService.updateOne(input.id, updateData);

					// Read back the updated preset
					const updatedPreset = await presetsService.readOne(input.id, {
						fields: ["*"],
					});

					return {
						content: [
							{
								type: "text",
								text: `Preset ${input.id} updated successfully`,
							},
							{
								type: "text",
								text: JSON.stringify(updatedPreset, null, 2),
							},
						],
					};
				}

				case "delete": {
					await presetsService.deleteOne(input.id);

					return {
						content: [
							{
								type: "text",
								text: `Preset ${input.id} deleted successfully`,
							},
						],
					};
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [
					{
						type: "text",
						text: `Error: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	});
});
