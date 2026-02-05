# Quick Start Guide - Archive Content Extension

Get the Archive Content extension up and running in 5 minutes.

## Prerequisites

- ✅ Jahia DX 8.2+ running locally or on dev server
- ✅ Node.js 14+ installed
- ✅ Maven 3.6+ installed
- ✅ Access to Jahia with administrator privileges

## Installation (5 Steps)

### 1. Navigate to Module Directory

```bash
cd /Users/stephane/Runtimes/0.Modules/archive
```

### 2. Install Node Dependencies

```bash
npm install
```

**Expected output**: Dependencies installed in `node_modules/`

### 3. Build Frontend Assets

```bash
npm run webpack
```

**Expected output**: 
```
Hash: [hash]
Version: webpack 5.x.x
Time: 3000ms
Built at: [timestamp]
Asset                          Size
jahia.bundle.js               250 KiB
```

### 4. Build Module

```bash
mvn clean install
```

**Expected output**:
```
[INFO] BUILD SUCCESS
[INFO] Total time: 30 s
[INFO] Final jar: target/archive-1.0-SNAPSHOT.jar
```

### 5. Deploy to Jahia

**Option A - Maven Deploy:**
```bash
mvn jahia:deploy
```

**Option B - Manual Copy:**
```bash
cp target/archive-*.jar $JAHIA_HOME/digital-factory-data/modules/
```

**Expected result**: Module appears in Jahia Module Manager

## Verification (3 Steps)

### 1. Check Module Status

1. Login to Jahia as administrator
2. Navigate to: **Administration → Server Settings → Modules**
3. Search for "archive"
4. Verify status: **Started** (green indicator)

### 2. Test Archive Action

1. Open **Content Editor**
2. Navigate to any unpublished content
3. Click **Content Actions** (⋮ menu)
4. Verify **Archive** action appears in the menu

### 3. Perform Test Archive

1. Select unpublished test content
2. Click **Archive** from Content Actions
3. Confirm in the dialog
4. Verify success notification
5. Check archive folder: `/[site]/contents/archive/[year]/[month]/`

## Troubleshooting

### Module won't start

**Check:**
```bash
tail -f $JAHIA_HOME/tomcat/logs/jahia.log | grep -i archive
```

**Common causes:**
- Dependency conflict → Check pom.xml
- Invalid CND syntax → Review definitions.cnd
- Missing permissions → Check import/permissions.xml

**Fix:**
```bash
# Rebuild and redeploy
mvn clean install jahia:deploy
```

### Archive action not visible

**Check:**
1. Extension registered: Browser console → `[ArchiveContent] Archive action registered`
2. Permissions: User has `jcr:write` on content
3. JavaScript loaded: Network tab → `jahia.bundle.js` status 200

**Fix:**
```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### GraphQL errors

**Check console:**
```javascript
// Browser console
// Look for: [ArchiveContent] GraphQL errors: [...]
```

**Common errors:**
- `Permission denied` → Grant user proper permissions
- `Node not found` → Verify path is correct
- `Invalid field` → Check GraphQL schema version

## Quick Configuration

### Change Archive Folder Name

**File**: `src/javascript/ArchiveContent/utils/archiveUtils.js`

```javascript
// Change from 'archive' to your preference
export const ARCHIVE_FOLDER_NAME = 'archived-content';
```

**Rebuild:**
```bash
npm run webpack && mvn clean install jahia:deploy
```

### Grant Archive Permission to Role

**Via Jahia UI:**
1. Administration → Users and Roles → Roles
2. Select role (e.g., "editor")
3. Click "Edit Permissions"
4. Check "Archive Content"
5. Save

**Via XML** (`src/main/import/roles.xml`):
```xml
<your-role jcr:primaryType="jnt:role"
           j:permissionNames="archiveContent"
/>
```

### Add Custom Translations

**File**: `src/main/resources/javascript/locales/en.json`

```json
{
  "archive": {
    "label": "Your Custom Label",
    "dialog.title.archive": "Your Custom Title"
  }
}
```

**Rebuild:**
```bash
mvn clean install jahia:deploy
```

## Development Workflow

### Watch Mode (Auto-rebuild)

```bash
npm run dev
```

**Terminal 1:**
```bash
# Auto-rebuild frontend on file changes
npm run dev
```

**Terminal 2:**
```bash
# Auto-deploy on Maven changes
mvn jahia:deploy -Dmaven.test.skip=true
```

**Benefit**: Changes reflected immediately after browser refresh

### Debug Mode

**Enable debug logging:**

Browser console:
```javascript
// Check for debug messages
// Filter by: /ArchiveContent/
```

**Add custom debug:**

```javascript
import { debugLog } from './utils/archiveUtils';

debugLog('My custom debug message', { data: 'value' });
```

**Output** (development mode only):
```
[ArchiveContent] My custom debug message {data: "value"}
```

### Linting

**Run linter:**
```bash
npm run lint
```

**Auto-fix issues:**
```bash
npm run lint:fix
```

## Common Development Tasks

### Add New GraphQL Query

**1. Define query** (`src/javascript/ArchiveContent/graphql/queries.js`):

```javascript
export const MY_NEW_QUERY = `
  query MyQuery($param: String!) {
    jcr {
      nodeByPath(path: $param) {
        uuid
      }
    }
  }
`;
```

**2. Use in service** (`src/javascript/ArchiveContent/services/ArchiveService.js`):

```javascript
import { MY_NEW_QUERY } from '../graphql/queries';

async myMethod(path) {
    const data = await executeGraphQL(MY_NEW_QUERY, { param: path });
    return data.jcr?.nodeByPath;
}
```

### Add New Dialog

**1. Create component** (`src/javascript/ArchiveContent/components/MyDialog.jsx`):

```jsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@jahia/moonstone';

export const MyDialog = ({ open, onClose }) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>My Custom Dialog</DialogTitle>
            <DialogContent>Content here</DialogContent>
            <DialogActions>
                <Button label="Close" onClick={onClose} />
            </DialogActions>
        </Dialog>
    );
};
```

**2. Import and use**:

```jsx
import { MyDialog } from './MyDialog';

// In your component
const [dialogOpen, setDialogOpen] = useState(false);

return (
    <>
        <Button onClick={() => setDialogOpen(true)} />
        <MyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
);
```

### Add New Node Property

**1. Update CND** (`src/main/resources/META-INF/definitions.cnd`):

```cnd
[jmix:archived] mixin
 - myNewProperty (string) indexed=no
```

**2. Update mutation** (`src/javascript/ArchiveContent/graphql/mutations.js`):

```graphql
setMyProperty: setProperty(
    name: "myNewProperty", 
    value: $myValue, 
    type: STRING
) { path }
```

**3. Use in service**:

```javascript
await executeGraphQL(SET_PROPERTIES, {
    // ... existing params
    myValue: 'my value'
});
```

**4. Rebuild and deploy**:

```bash
mvn clean install jahia:deploy
```

## Testing Scenarios

### Test Case 1: Archive Unpublished Content

1. Create test content
2. Ensure it's unpublished
3. Archive it
4. ✅ Verify: Success notification
5. ✅ Verify: Content in archive folder
6. ✅ Verify: Metadata set correctly

### Test Case 2: Try Archive Published Content

1. Create and publish test content
2. Try to archive
3. ✅ Verify: Warning dialog appears
4. ✅ Verify: Archive blocked
5. Unpublish content
6. Archive again
7. ✅ Verify: Success

### Test Case 3: First Archive in Site

1. Delete archive folder if exists
2. Archive content
3. ✅ Verify: Archive folder auto-created
4. ✅ Verify: Date folders created (YYYY/MM)
5. ✅ Verify: Content archived successfully

### Test Case 4: Name Collision

1. Archive content named "test"
2. Create another content named "test" in same location
3. Archive the second one
4. ✅ Verify: Suffix appended (e.g., "test-archived-1738704523000")
5. ✅ Verify: Both in archive without conflict

## Resources

- 📖 **Full Documentation**: [README.md](README.md)
- 🔧 **Technical Guide**: [TECHNICAL.md](TECHNICAL.md)
- 👤 **User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
- 📝 **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## Next Steps

1. ✅ Module installed and working
2. 📚 Read the full README for features
3. 🧪 Test all scenarios
4. 🎨 Customize for your needs
5. 🚀 Deploy to staging/production

## Support

**Issues?** Check:
1. Browser console for JavaScript errors
2. `jahia.log` for server-side errors
3. Module Manager for module status

**Need help?**
- Review TECHNICAL.md for troubleshooting
- Contact Jahia support
- Check Jahia Academy documentation

---

**Happy archiving! 🗄️**
