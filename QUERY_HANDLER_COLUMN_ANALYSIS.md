# Query Handler Column Analysis - jContent Architecture

## Summary

**Query handlers in jContent do NOT provide column definitions.** Columns are handled separately through:
1. **Hard-coded column sets** for standard modes (media, content, search)
2. **tableConfig.columns** property in accordion registration (rare, used only by picker components)
3. **propColumns** prop passed to ContentTable (the extension point we're using)

## Key Findings

### 1. Query Handler Interface

Query handlers implement a simple interface with NO column-related methods:

```javascript
export const BaseQueryHandler = {
    getQuery() {
        return BaseChildrenQuery;
    },
    
    getQueryVariables({path, lang, uilang, pagination, sort, typeFilter}) {
        // Returns variables for GraphQL query
    },
    
    getResults(data) {
        // Extracts results from GraphQL response
    },
    
    getFragments() {
        // Returns GraphQL fragments to include
        return [];
    },
    
    structureData(parentPath, result) {
        // Structures flat data into tree if needed
    },
    
    isStructured: () => false
};
```

**No getColumns() method exists in any query handler.**

### 2. FilesQueryHandler (Media)

Location: `/JContent/ContentRoute/ContentLayout/queryHandlers/FilesQueryHandler.js`

```javascript
export const FilesQueryHandler = {
    ...BaseQueryHandler,

    getQueryVariables: selection => ({
        ...BaseQueryHandler.getQueryVariables(selection),
        fieldGrouping: {
            fieldName: 'primaryNodeType.name',
            groups: ['jnt:folder'],
            groupingType: 'START'
        }
    }),

    getFragments: () => [imageFields, usagesCount]
};
```

**Does NOT return columns.** Only provides query configuration.

### 3. CategoriesQueryHandler

Location: `/JContent/ContentRoute/ContentLayout/queryHandlers/CategoriesQueryHandler.js`

```javascript
export const CategoriesQueryHandler = {
    ...BaseQueryHandler,

    getQueryVariables: selection => ({
        ...BaseQueryHandler.getQueryVariables(selection),
        fieldGrouping: {
            fieldName: 'primaryNodeType.name',
            groups: ['jnt:category'],
            groupingType: 'START'
        }
    })
};
```

**Does NOT return columns.** Even simpler than FilesQueryHandler.

### 4. How Columns Are Actually Handled

#### A. Hard-coded Column Sets (Standard Approach)

Location: `/JContent/ContentRoute/ContentLayout/ContentTable/ContentTable.jsx`

```javascript
export const ContentTable = ({rows, isContentNotFound, totalCount, isLoading, isStructured, columns: propColumns, selector}) => {
    const columns = useMemo(() => {
        if (propColumns) {
            return propColumns;  // ← Custom columns override
        }

        if (isInSearchMode(mode)) {
            return searchColumnData;
        }

        return mode === JContentConstants.mode.MEDIA ? mediaColumnData : mainColumnData;
    }, [mode, propColumns]);
    
    // ... rest of component
};
```

Column definitions from `/ContentTable/reactTable/columns/columns.js`:

```javascript
export const mediaColumnData = [
    publicationStatus, 
    selection, 
    nameBigIcon, 
    status, 
    usages, 
    fileSize, 
    mediaType, 
    createdBy, 
    lastModified, 
    visibleActions
];

export const mainColumnData = [
    publicationStatus,
    selection,
    name,
    type,
    createdBy,
    lastModified,
    visibleActions
];
```

#### B. tableConfig.columns (Picker Components Only)

Location: `/ContentEditor/SelectorTypes/Picker/configs/userPicker.js`

```javascript
registry.add(Constants.ACCORDION_ITEM_NAME, 'picker-user', {
    targets: ['user:50'],
    icon: <FolderUser/>,
    label: 'jcontent:label.contentEditor.picker.navigation.users',
    rootPath: '/',
    tableConfig: {
        queryHandler: PickerUsersQueryHandler,
        getFragments: () => [UserPickerFragment],
        columns: [nameColumn]  // ← Columns defined in tableConfig
    }
});
```

Used in picker dialogs:

```javascript
const {tableConfig} = registry.get(Constants.ACCORDION_ITEM_NAME, 'picker-user') || {};

const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows: tableRows,
    prepareRow
} = useTable({
    data: result?.nodes || [],
    columns: tableConfig.columns,  // ← Direct use from tableConfig
    sort,
    onSort: (column, order) => setSort({orderBy: column.property, order})
}, reactTable.useSort);
```

### 5. Standard Accordion Registration (No Columns)

Location: `/JContent/JContent.accordion-items.jsx`

```javascript
registry.add('accordionItem', 'media', renderDefaultContentTrees, {
    targets: ['jcontent:70'],
    icon: <Collections/>,
    label: 'jcontent:label.contentManager.navigation.media',
    rootPath: '/sites/{site}/files',
    tableConfig: {
        queryHandler: FilesQueryHandler,
        typeFilter: ['jnt:file', 'jnt:folder'],
        viewSelector: <FileModeSelector/>,
        sortSelector: <SortSelector/>,
        // NO columns property here
    },
    treeConfig: {
        selectableTypes: ['jnt:folder'],
        openableTypes: ['jnt:folder'],
        rootLabel: 'jcontent:label.contentManager.browseFiles',
        sortBy: SORT_CONTENT_TREE_BY_NAME_ASC,
        dnd: { canDrag: true, canDrop: true, canDropFile: true }
    }
});
```

### 6. Query Handler Call Flow

```
useLayoutQuery (options)
    ↓
1. Gets tableConfig from accordion registration
2. Gets queryHandler from tableConfig
3. Calls queryHandler.getQuery()
4. Calls queryHandler.getQueryVariables(options)
5. Calls queryHandler.getFragments()
    ↓
Executes GraphQL query
    ↓
6. Calls queryHandler.getResults(data)
7. Calls queryHandler.structureData(parentPath, result)
    ↓
Returns {isStructured, result, error, loading, refetch}
```

**No column information is requested or returned.**

### 7. How ContentLayout Receives Columns

Location: `/JContent/ContentRoute/ContentLayout/ContentLayout.jsx`

```javascript
export const ContentLayout = ({mode, previewState, filesMode, previewSelection, rows, isContentNotFound, totalCount, isLoading, isStructured}) => {
    const contextualMenu = useRef();
    const previewOpen = previewState >= CM_DRAWER_STATES.SHOW;
    return (
        <div className={styles.root}>
            <div className={classNames(styles.content)}>
                <Paper className={styles.contentPaper}>
                    <ErrorBoundary key={filesMode}>
                        <ContentTable totalCount={totalCount}
                                      rows={rows}
                                      isContentNotFound={isContentNotFound}
                                      isStructured={isStructured}
                                      isLoading={isLoading}/>
                                      {/* NO columns prop passed here! */}
                    </ErrorBoundary>
                </Paper>
            </div>
        </div>
    );
};
```

**ContentLayout does NOT pass any columns to ContentTable** - it relies on ContentTable's internal logic to determine columns based on mode.

## Why This Matters for Archive Module

### Current Implementation ✅

Our Archive Manager accordion registration:

```javascript
registry.add('accordionItem', 'archive', renderDefaultContentTrees, {
    targets: ['jcontent:70'],
    icon: <Archive/>,
    label: 'archive:archive.label.archiveManager.name',
    appsTarget: 'archive-manager',
    rootPath: '/sites/{site}/Archives',
    tableConfig: {
        queryHandler: ArchivedNodesQueryHandler,
        showHeader: true,
        typeFilter: ['jmix:archived'],
        viewSelector: undefined,
        columns: archiveColumns  // ← We defined columns here
    }
});
```

### The Problem ❌

**jContent's ContentLayout does NOT read `tableConfig.columns` for standard accordions.**

This pattern (`tableConfig.columns`) is only used by:
- Picker components (userPicker, mediaPicker, etc.)
- Custom table implementations outside the main ContentLayout

### Solutions

#### Option 1: Modify jContent's ContentLayout (RECOMMENDED)

Add column support to ContentLayout:

```javascript
export const ContentLayout = ({mode, previewState, filesMode, previewSelection, rows, isContentNotFound, totalCount, isLoading, isStructured}) => {
    const contextualMenu = useRef();
    const previewOpen = previewState >= CM_DRAWER_STATES.SHOW;
    
    // ADD THIS: Get custom columns from accordion's tableConfig
    const tableConfig = registry.get('accordionItem', mode)?.tableConfig;
    const customColumns = tableConfig?.columns;
    
    return (
        <div className={styles.root}>
            <div className={classNames(styles.content)}>
                <Paper className={styles.contentPaper}>
                    <ErrorBoundary key={filesMode}>
                        <ContentTable 
                            totalCount={totalCount}
                            rows={rows}
                            columns={customColumns}  // ← Pass custom columns
                            isContentNotFound={isContentNotFound}
                            isStructured={isStructured}
                            isLoading={isLoading}
                        />
                    </ErrorBoundary>
                </Paper>
            </div>
        </div>
    );
};
```

This is a **2-line change** to jContent that enables ALL custom accordions to provide columns.

#### Option 2: Fork/Override ContentLayout (COMPLEX)

Create a custom ContentLayout component in archive module that reads columns from tableConfig. Requires overriding the entire rendering pipeline.

#### Option 3: Registry-based Columns (ARCHITECTURAL CHANGE)

Register columns separately in the registry system:

```javascript
registry.add('tableColumn', 'archive-originalPath', {
    targets: ['archive-manager:50'],
    id: 'originalPath',
    header: 'archive:archive.label.archiveManager.table.originalPath',
    // ... column config
});
```

Then modify ContentTable to read from registry. This is how some other systems work but is NOT the current jContent pattern.

## Conclusion

1. **Query handlers do NOT provide columns** - they only handle data fetching
2. **Columns are separate from query handlers** in jContent architecture
3. **Media mode uses hard-coded columns** (`mediaColumnData`), not columns from FilesQueryHandler
4. **tableConfig.columns exists** but is only used by picker components
5. **ContentTable accepts propColumns** but ContentLayout doesn't pass them
6. **Our implementation is correct** - we just need jContent to bridge the gap

## Recommendation

The cleanest solution is to **modify jContent's ContentLayout** to read and pass `tableConfig.columns` to ContentTable. This:
- ✅ Requires minimal code change (2 lines)
- ✅ Follows existing patterns (tableConfig already used for many settings)
- ✅ Enables all custom accordions to provide columns
- ✅ Doesn't break existing functionality (columns are optional)
- ✅ Aligns with how picker components already work

See [JCONTENT_MODIFICATIONS_NEEDED.md](JCONTENT_MODIFICATIONS_NEEDED.md) for exact implementation details.
