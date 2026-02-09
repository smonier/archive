/**
 * Custom columns for Archive Manager table
 * Displays jmix:archived properties: originalPath, archivedAt, archivedBy
 */
import React from 'react';
import PropTypes from 'prop-types';
import {Typography} from '@jahia/moonstone';
import dayjs from 'dayjs';

// Cell component for display name
const DisplayNameCell = ({value}) => (
    <Typography variant="body">{value || '-'}</Typography>
);

DisplayNameCell.propTypes = {
    value: PropTypes.string
};

// Cell component for type
const TypeCell = ({value}) => (
    <Typography variant="body">{value || '-'}</Typography>
);

TypeCell.propTypes = {
    value: PropTypes.string
};

// Cell component for original path
const OriginalPathCell = ({value}) => (
    <Typography variant="body" title={value}>{value || '-'}</Typography>
);

OriginalPathCell.propTypes = {
    value: PropTypes.string
};

// Cell component for archived date
const ArchivedAtCell = ({value}) => {
    if (!value) {
        return <Typography variant="body">-</Typography>;
    }

    const date = dayjs(value);
    return (
        <Typography variant="body" title={date.format('LLLL')}>
            {date.format('L LT')}
        </Typography>
    );
};

ArchivedAtCell.propTypes = {
    value: PropTypes.string
};

// Cell component for archived by
const ArchivedByCell = ({value}) => (
    <Typography variant="body">{value || '-'}</Typography>
);

ArchivedByCell.propTypes = {
    value: PropTypes.string
};

// Column definitions for Archive Manager
export const archiveColumns = [
    {
        id: 'displayName',
        header: 'archive:archive.label.archiveManager.table.displayName',
        accessor: row => row.displayName,
        sortable: true,
        property: 'jcr:displayName',
        Cell: DisplayNameCell
    },
    {
        id: 'type',
        header: 'archive:archive.label.archiveManager.table.type',
        accessor: row => row.primaryNodeType?.displayName || row.primaryNodeType?.name,
        sortable: true,
        property: 'jcr:primaryType',
        Cell: TypeCell
    },
    {
        id: 'originalPath',
        header: 'archive:archive.label.archiveManager.table.originalPath',
        accessor: row => row.originalPath?.value,
        sortable: true,
        property: 'jmix:originalPath',
        Cell: OriginalPathCell
    },
    {
        id: 'archivedAt',
        header: 'archive:archive.label.archiveManager.table.archivedAt',
        accessor: row => row.archivedAt?.value,
        sortable: true,
        property: 'jmix:archivedAt',
        Cell: ArchivedAtCell
    },
    {
        id: 'archivedBy',
        header: 'archive:archive.label.archiveManager.table.archivedBy',
        accessor: row => row.archivedBy?.value,
        sortable: true,
        property: 'jmix:archivedBy',
        Cell: ArchivedByCell
    }
];
