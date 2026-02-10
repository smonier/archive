# Archive Content - Jahia UI Extension

A production-ready Jahia UI Extension that enables archiving of JCR content from the Content Editor's Content Actions menu.

## Overview

This extension provides a safe, controlled way to archive unpublished content in Jahia DX 8.2+. Archived content is moved to a date-organized archive folder structure and marked with metadata preserving the original location for potential restoration.

## Features

- **Content Actions Integration**: Archive action accessible from the Content Actions menu (target: `contentActions:999`)
- **Date-Organized Structure**: Automatic organization by year/month (YYYY/MM) using Jahia's autosplit capability
- **Publication Safety**: Prevents archiving of published content with clear warning dialogs
- **Metadata Preservation**: Stores original path, parent ID, archive timestamp, and archiving user
- **GraphQL-Based**: All repository operations use Jahia GraphQL mutations (no REST/JCR API)
- **Moonstone UX**: Professional dialogs, toasts, loading states, and error handling
- **Multi-language**: English and French localization included
- **Permission-Aware**: Respects Jahia permissions (requires `jcr:write`)

## Architecture

### Folder Structure

```
src/javascript/ArchiveContent/
├── components/
│   └── ArchiveContentAction.jsx    # Main React component with dialogs
├── services/
│   └── ArchiveService.js            # Core business logic
├── graphql/
│   ├── queries.js                   # GraphQL queries
│   └── mutations.js                 # GraphQL mutations
├── utils/
│   └── archiveUtils.js              # Helper functions
└── index.js                         # Entry point

src/main/resources/
├── META-INF/
│   └── definitions.cnd              # JCR node type definitions
└── javascript/locales/
    ├── en.json                      # English translations
    └── fr.json                      # French translations
```

## Archive Folder Structure

```
/<siteKey>/
  └── Archives/                      (jnt:archiveContentFolder)
      └── <YYYY>/                    (jnt:contentFolder)
          └── <MM>/                  (jnt:contentFolder)
              └── [archived-content-nodes]
```

### Example

```
/mysite/
  └── Archives/
          └── 2026/
              └── 02/
                  ├── old-news-article
                  ├── deprecated-page
                  └── obsolete-content-archived-1738704523000
```

## JCR Node Types

### jnt:archiveContentFolder

Primary node type for the archive root folder.

**Mixins:**
- `jmix:droppableContent` - Allows content to be moved into it
- `jmix:nolive` - Never published to live workspace
- `jmix:visibleInContentTree` - Visible in content tree navigation
- `jmix:autoSplitFolders` - Automatic date-based folder creation

### jmix:archived

Mixin applied to archived content nodes.

**Properties:**
- `archived` (boolean, mandatory, default: true) - Archive flag
- `archivedAt` (date, mandatory, autocreated) - Archive timestamp
- `archivedBy` (weakreference, mandatory) - Reference to user who archived
- `originalPath` (string, mandatory, indexed) - Full path before archiving
- `originalParentId` (string, mandatory) - Parent UUID before move

## Archive Flow

1. **Validation Phase**
   - Fetch node information via GraphQL
   - Check if already archived → show "Already Archived" dialog
   - Check if published → show "Cannot Archive" warning
   - Preview destination path in confirmation dialog

2. **Preparation Phase** (if validation passes)
   - Resolve site key from node path
   - Check if archive folder exists at `/<siteKey>/Archives`
   - Create archive folder if missing (transparent, first-run only)
   - Ensure date folders (YYYY/MM) exist, create if needed

3. **Archive Operation**
   - Add `jmix:archived` mixin to the node
   - Set archive properties (archived, archivedAt, archivedBy, originalPath, originalParentId)
   - Move node to `/<siteKey>/Archives/<YYYY>/<MM>/`
   - Handle name collisions by appending `-archived-<timestamp>` suffix

4. **Completion**
   - Show success notification with archive path
   - Optionally refresh content view

## Read-Only Enforcement

Archived content becomes effectively read-only through:

1. **Archive Folder Configuration**
   - `jmix:nolive` prevents publication
   - Typical content editors don't have direct access to archive folder

2. **Mixin Marker**
   - `jmix:archived` can be used in Jahia permissions/rules to deny write
   - Administrators retain full access if needed

**Note:** True read-only enforcement depends on site-specific permission configuration. The mixin provides a marker for permission rules. In a production environment, configure role-based ACLs to deny write access to archived content for non-admin roles.

## GraphQL Operations

### Key Queries

- `GET_NODE_INFO` - Fetch node details, publication status, existing mixins
- `CHECK_ARCHIVE_FOLDER` - Verify archive folder existence
- `GET_CURRENT_USER` - Get current user reference for metadata
- `GET_SITE_INFO` - Resolve site key from node path

### Key Mutations

- `CREATE_ARCHIVE_FOLDER` - Create archive root folder
- `CREATE_FOLDER` - Create intermediate date folders
- `ADD_MIXIN` - Add `jmix:archived` mixin
- `SET_PROPERTIES` - Set archive metadata properties
- `MOVE_NODE` - Move node to archive destination

## Error Handling

The extension provides user-friendly error messages for common scenarios:

- **Permission Denied**: "You do not have permission to perform this action."
- **Content Not Found**: "The content could not be found."
- **Content Locked**: "The content is locked and cannot be archived."
- **Generic Errors**: Technical details logged to console, friendly message shown to user

All errors are logged with `[ArchiveContent]` prefix for debugging.

## Usage

### From Content Editor

1. Select a content node in the Content Editor
2. Open the **Content Actions** menu (three-dot menu or right-click)
3. Click **Archive**
4. Review the confirmation dialog showing:
   - Content name and current path
   - Archive destination preview (YYYY/MM)
5. Click **Archive** to confirm or **Cancel** to abort
6. Success notification appears with archive destination path

### Published Content Warning

If content is published:
- A warning dialog blocks the operation
- Message: "This content is currently published and cannot be archived. Please unpublish this content manually before archiving."
- User must unpublish manually, then retry archive

### Already Archived

If content is already archived:
- Information dialog shows: "This content has already been archived."
- No duplicate archive operation performed

## Installation

1. Build the module:
   ```bash
   mvn clean install
   ```

2. Deploy to Jahia:
   - Copy the JAR to `digital-factory-data/modules/`
   - Or deploy via Jahia Module Manager

3. The extension auto-registers on module load

## Configuration

### Archive Folder Name

Default: `archive`

To customize, edit `ARCHIVE_FOLDER_NAME` in [archiveUtils.js](src/javascript/ArchiveContent/utils/archiveUtils.js#L6):

```javascript
export const ARCHIVE_FOLDER_NAME = 'archive'; // Change to your preference
```

### Required Permissions

- `jcr:write` permission on the content node
- `jcr:addChildNodes` on `/<siteKey>/` (for first-run folder creation)

### Debug Logging

Enable debug logs in development:

```javascript
// In archiveUtils.js, debugLog only outputs in development mode
if (process.env.NODE_ENV === 'development') {
    console.debug(`[ArchiveContent] ${message}`, data || '');
}
```

Production builds automatically suppress debug logs.

## Development

### Prerequisites

- Node.js 14+
- Maven 3.6+
- Jahia DX 8.2+

### Build

```bash
# Install dependencies
npm install

# Build frontend assets
npm run webpack

# Build Java module
mvn clean install
```

### Testing

Run the module in a Jahia development environment:

```bash
mvn jahia:deploy
```

Test scenarios:
- ✅ Archive unpublished content → Success
- ✅ Archive published content → Warning dialog
- ✅ Archive already archived content → Info dialog
- ✅ First archive in site → Auto-creates folder
- ✅ Name collision → Appends suffix
- ✅ Permission denied → Error message
- ✅ Date structure → Organizes by YYYY/MM

## Troubleshooting

### Archive folder not created
- Check user has `jcr:addChildNodes` permission on `/<siteKey>/`
- Verify `jnt:archiveContentFolder` node type is registered
- Check console for GraphQL errors

### Cannot archive (permission denied)
- Ensure user has `jcr:write` on the content node
- Check if node is locked by another user
- Verify user has access to the content's site

### Archived content still editable
- Review Jahia ACL configuration
- Add permission rules based on `jmix:archived` mixin
- Configure role-based write denial for archived content

### Date folders not created
- Ensure GraphQL mutations have proper permissions
- Check if parent archive folder has `jmix:autoSplitFolders`
- Verify folder creation logic in `ArchiveService.ensureDateFoldersExist()`

## Extension Points

### Custom Archive Logic

Extend `ArchiveService` to customize behavior:

```javascript
import ArchiveService from './services/ArchiveService';

// Override destination path logic
ArchiveService.getCustomDestination = (nodeInfo) => {
    // Custom logic here
    return customPath;
};
```

### Additional Metadata

Add more properties in [mutations.js](src/javascript/ArchiveContent/graphql/mutations.js):

```graphql
setCustomProperty: setProperty(
    name: "customField", 
    value: $customValue, 
    type: STRING
) { path }
```

## Known Limitations

1. **Single Selection**: Currently supports single node selection (not bulk archive)
2. **Manual Unpublish**: Published content must be manually unpublished
3. **Permission Configuration**: Read-only enforcement requires ACL setup
4. **No Unarchive UI**: This module provides archive only; restoration requires custom development

## Roadmap

- [ ] Bulk archive (multi-selection support)
- [ ] Unarchive action (restore to original location)
- [ ] Archive search/browser UI
- [ ] Scheduled auto-archive based on content age
- [ ] Archive analytics and reporting

## Support

For issues, questions, or contributions:
- Check Jahia documentation: https://academy.jahia.com/
- Review GraphQL API: https://academy.jahia.com/documentation/developer/dx/8/extending-jahia-dx/using-graphql-api
- Console logs: Look for `[ArchiveContent]` prefix

## License

This module is provided as-is for Jahia DX projects.

## Credits

Built following Jahia UI Extension best practices and Moonstone design system.
