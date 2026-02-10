import {registry} from '@jahia/ui-extender';
import constants from './AdminPanel.constants';
import {AdminPanel} from './AdminPanel';
import React, {Suspense} from 'react';
import {Archive} from '@jahia/moonstone';

export const registerRoutes = () => {
    registry.add('adminRoute', 'archive', {
        targets: ['contentActions:999'],
        icon: <Archive/>,
        label: 'archive:archive.label.archiveContent',
        requiredPermission: 'archiveContent',
        path: `${constants.DEFAULT_ROUTE}*`, // Catch everything and let the app handle routing logic
        defaultPath: constants.DEFAULT_ROUTE,
        isSelectable: true,
        render: v => <Suspense fallback="loading ..."><AdminPanel match={v.match}/></Suspense>
    });
};
