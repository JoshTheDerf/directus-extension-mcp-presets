# Directus MCP Presets Extension

A Directus extension that adds a `presets` tool to the MCP (Model Context Protocol) interface, allowing AI agents to create, read, update, and delete presets for collections.

## Features

- **Create** user-specific, role-specific, or global presets
- **Read** presets with filtering by collection, role, or user
- **Update** existing preset configurations
- **Delete** presets
- Full integration with Directus permissions and accountability
- Support for bookmarks, layout options, filters, and more

## Prerequisites

This extension requires the `directus-extension-mcp-customization` extension to be installed and enabled.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. The extension will be automatically loaded by Directus when the server starts.

## Usage

The `presets` tool supports four operations:

### Create a Preset

Create a personal bookmark for draft articles:
```json
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
```

Create a role-specific default layout:
```json
{
  "action": "create",
  "collection": "articles",
  "role": "role-uuid-here",
  "layout": "cards",
  "layout_options": {
    "size": "large"
  }
}
```

### Read Presets

Read all presets for a collection:
```json
{
  "action": "read",
  "collection": "articles",
  "limit": 20
}
```

Filter by user-specific presets:
```json
{
  "action": "read",
  "collection": "articles",
  "user": "user-uuid-here"
}
```

### Update a Preset

```json
{
  "action": "update",
  "id": 123,
  "bookmark": "Updated Name",
  "filter": {
    "status": { "_eq": "published" }
  }
}
```

### Delete a Preset

```json
{
  "action": "delete",
  "id": 123
}
```

## What are Presets?

Presets in Directus define the layout and filtering options for collections. They can be:

- **User presets**: Personal to a specific user
- **Role presets**: Shared across all users with a specific role
- **Global presets**: Available to all users (requires admin permissions)

Presets can include:
- Bookmarks (appear in sidebar navigation)
- Layout configurations (tabular, cards, calendar, etc.)
- Filter rules
- Search queries
- Custom icons and colors

### Preset Scope

The `role` and `user` fields control preset scope:

- **Both null**: Global preset (requires admin permissions)
- **User set**: Personal preset for that specific user
- **Role set**: Shared preset for all users with that role

## Technical Details

### Architecture

This extension uses the Directus hook system to:
1. Register the `presets` tool in the MCP tools list via the `mcp.tools.list` filter
2. Handle tool execution via the `presets.mcp.tools.call` filter event
3. Receive user accountability from the `meta` parameter passed by the customization extension
4. Use `PresetsService` with proper accountability for permission-aware operations

### Filter Event Handler

```typescript
emitter.onFilter("presets.mcp.tools.call", async (toolCall, meta) => {
  // Extract accountability from meta parameter
  const { accountability } = meta;

  // Get input arguments from toolCall
  const input = presetInputSchema.parse(toolCall.arguments);

  // Create service with accountability for proper permissions
  const presetsService = new PresetsService({
    schema: await getSchema(),
    accountability,  // Ensures user context and permissions
  });

  // Perform operations with permission enforcement
  // ...
});
```

## Development

Watch mode for development:
```bash
npm run dev
```

Validate the extension:
```bash
npm run validate
```

## License

MIT
