import React from 'react';
import {useTranslation} from 'react-i18next';
import {Typography} from '@jahia/moonstone';

/**
 * Archive Manager Component
 * Displays archived content in a table view
 */
export const ArchiveManager = () => {
    const {t} = useTranslation('archive');

    return (
        <div style={{padding: '20px'}}>
            <Typography variant="heading">
                {t('archive:label.archiveManager.name', 'Archive Manager')}
            </Typography>
            <Typography variant="body">
                {t('archive:label.archiveManager.description', 'View and manage archived content')}
            </Typography>
        </div>
    );
};

export default ArchiveManager;
