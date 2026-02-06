/* eslint-disable react/prop-types */
import React from 'react';

// Title cell with display name
const TitleCell = ({value}) => <span>{value || '-'}</span>;

// Type cell showing node type
const TypeCell = ({value}) => {
    if (!value) {
        return '-';
    }

    return <span>{value}</span>;
};

// Path cell for original location
const PathCell = ({value}) => {
    if (!value) {
        return '-';
    }

    return <span title={value}>{value}</span>;
};

// Date cell with formatted date
const DateCell = ({value}) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    return <span title={date.toLocaleString()}>{date.toLocaleDateString()}</span>;
};

// User cell showing who archived
const UserCell = ({value}) => {
    if (!value) {
        return '-';
    }

    // Extract username from path or show value
    const username = value.includes('/') ? value.split('/').pop() : value;
    return <span title={value}>{username}</span>;
};

export const registerArchiveTableColumns = registry => {
    const columns = [
        {
            id: 'displayName',
            Header: 'archive:label.archiveManager.table.displayName',
            accessor: 'displayName',
            label: 'archive:label.archiveManager.table.displayName',
            sortable: true,
            property: 'displayName',
            Cell: ({value}) => <TitleCell value={value}/>
        },
        {
            id: 'type',
            Header: 'archive:label.archiveManager.table.type',
            accessor: row => row.primaryNodeType?.displayName || row.primaryNodeType?.name,
            label: 'archive:label.archiveManager.table.type',
            sortable: true,
            property: 'primaryNodeType.displayName',
            Cell: ({value}) => <TypeCell value={value}/>
        },
        {
            id: 'originalPath',
            Header: 'archive:label.archiveManager.table.originalPath',
            accessor: row => row.originalPath?.value,
            label: 'archive:label.archiveManager.table.originalPath',
            sortable: true,
            property: 'originalPath',
            Cell: ({value}) => <PathCell value={value}/>
        },
        {
            id: 'archivedAt',
            Header: 'archive:label.archiveManager.table.archivedAt',
            accessor: row => row.archivedAt?.value,
            label: 'archive:label.archiveManager.table.archivedAt',
            sortable: true,
            property: 'archivedAt',
            Cell: ({value}) => <DateCell value={value}/>
        },
        {
            id: 'archivedBy',
            Header: 'archive:label.archiveManager.table.archivedBy',
            accessor: row => row.archivedBy?.value,
            label: 'archive:label.archiveManager.table.archivedBy',
            sortable: true,
            property: 'archivedBy',
            Cell: ({value}) => <UserCell value={value}/>
        }
    ];

    columns.forEach(column => {
        registry.add('tableColumn', `archive-manager-${column.id}`, {
            targets: ['archive-manager:50'],
            ...column
        });
    });
};
