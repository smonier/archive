import React from 'react';
import {registry} from '@jahia/ui-extender';
import {addContextMenuTargetToActions} from '@jahia/jcontent';
import {Archive, Typography} from '@jahia/moonstone';
import {ArchivedNodesQueryHandler} from './ArchivedNodesQueryHandler';

// Sample custom column definition for the archive content type. 
// You can define your own columns and add them to the tableConfig.columns array 
// in the registerArchiveManagerComponents function below.
const contentTypeColumn = {
    id: 'archiveContentType',
    accessor: 'primaryNodeType.displayName',
    sortable: true,
    property: 'primaryNodeType.displayName',
    Cell: ({value}) => <Typography>{value}</Typography>,
    Header: () => <Typography weight="bold">Custom column</Typography>,
    width: '140px'
};

const registerArchiveManagerComponents = () => {
    window.jahia.i18n.loadNamespaces('archive');

    const renderDefaultContentTrees = registry.get('accordionItem', 'renderDefaultContentTrees');

    const accordionType = 'accordionItem';
    const accordionKey = 'archive';
    const accordionExists = registry.get(accordionType, accordionKey);

    if (!accordionExists) {
        // 1. Define a custom context menu
        const menuName = 'myCustomContextMenu';
        const menuTarget = 'myCustomContextMenuActions';
        const menuActionWithRenderer = registry.get('action', 'menuAction');
        registry.add('action', menuName, menuActionWithRenderer, {
            menuTarget,
            menuItemProps: {isShowIcons: true}
        });
        // 2. Define the actions that will be displayed in the custom context menu
        addContextMenuTargetToActions(menuTarget, ['edit', 'export']);

        registry.add(accordionType, accordionKey, renderDefaultContentTrees, {
            targets: ['jcontent:70'],
            icon: <Archive/>,
            label: 'archive:label.archiveManager.name',
            appsTarget: 'archive-manager',
            isEnabled: siteKey => siteKey !== 'systemsite',
            rootPath: '/sites/{site}/Archives',
            requiredPermission: 'archiveContent',
            requireModuleInstalledOnSite: 'archive',
            tableConfig: {
                queryHandler: ArchivedNodesQueryHandler,
                // 3. Specify custom context menu for the table
                contextualMenu: menuName,
                // This is for hiding badge status in the content header
                header: {showStatus: false},
                // Specify custom columns either by id (see src/javascript/ContentEditor/ContentTable/columns.js) or by providing a column definition object
                columns: ['publicationStatus', 'selection', 'name', contentTypeColumn, 'lastModified', 'visibleActions'],
                showHeader: true,
                typeFilter: ['jmix:archived'],
                viewSelector: undefined
            },
            treeConfig: {
                hideRoot: true,
                rootLabel: 'archive:label.archiveManager.name',
                icon: <Archive/>,
                selectableTypes: ['jnt:archiveContentFolder'],
                openableTypes: ['jnt:archiveContentFolder']
            }
        });
    }
};

export default registerArchiveManagerComponents;
