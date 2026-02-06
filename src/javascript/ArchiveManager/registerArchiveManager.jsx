import React from 'react';
import {registry} from '@jahia/ui-extender';
import {Archive} from '@jahia/moonstone';
import {ArchivedNodesQueryHandler} from './ArchivedNodesQueryHandler';

const registerArchiveManagerComponents = () => {
    window.jahia.i18n.loadNamespaces('archive');

    // Get the base configuration from renderDefaultContentTrees
    const renderDefaultContentTrees = registry.get('accordionItem', 'renderDefaultContentTrees');

    // Register accordion item
    const accordionType = 'accordionItem';
    const accordionKey = 'archive';
    const accordionExists = registry.get(accordionType, accordionKey);

    if (!accordionExists) {
        registry.add(accordionType, accordionKey, renderDefaultContentTrees, {
            targets: ['jcontent:70'],
            icon: <Archive/>,
            label: 'archive:archive.label.archiveManager.name',
            appsTarget: 'archive-manager',
            isEnabled: siteKey => siteKey !== 'systemsite',
            rootPath: '/sites/{site}/Archives',
            tableConfig: {
                queryHandler: ArchivedNodesQueryHandler,
                showHeader: true,
                typeFilter: ['jmix:archived'],
                viewSelector: undefined
            },
            treeConfig: {
                rootLabel: 'archive:archive.label.archiveManager.name',
                selectableTypes: ['jnt:archiveContentFolder'],
                openableTypes: ['jnt:archiveContentFolder']
            }
        });
    }

    console.log('%c Archive Manager registered', 'color: #3c8cba');
};

export default registerArchiveManagerComponents;
