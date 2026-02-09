# jContent Modifications Required for Custom Columns

## File to modify:
`/Users/stephane/Runtimes/0.Modules/jcontent/src/javascript/JContent/ContentRoute/ContentLayout/ContentLayout.jsx`

## Changes needed:

### 1. Add imports (after existing imports):
```javascript
import {registry} from '@jahia/ui-extender';
import {useSelector} from 'react-redux';
```

### 2. Add custom columns logic (inside ContentLayout component, after `const contextualMenu = useRef();`):
```javascript
const currentMode = useSelector(state => state.jcontent.mode);

// Get custom columns from registry if defined for this accordion
const customColumns = React.useMemo(() => {
    const columns = registry.find({type: 'tableColumn', target: `${currentMode}-columns`});
    return columns.length > 0 ? columns : undefined;
}, [currentMode]);
```

### 3. Pass propColumns to ContentTable:
```javascript
<ContentTable totalCount={totalCount}
              rows={rows}
              propColumns={customColumns}  // ADD THIS LINE
              isContentNotFound={isContentNotFound}
              isStructured={isStructured}
              isLoading={isLoading}/>
```

## How it works:
- ContentLayout checks registry for columns with target `${currentMode}-columns`
- For archive manager (mode='archive'), it looks for target `'archive-columns'`
- If custom columns are found, they're passed to ContentTable as `propColumns`
- ContentTable already supports this prop and will use these columns instead of default ones

## Then the archive module can register columns like:
```javascript
registry.add('tableColumn', 'archive-displayName', {
    targets: ['archive-columns:10'],
    // column definition
});
```
