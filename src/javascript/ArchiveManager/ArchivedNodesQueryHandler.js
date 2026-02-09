/**
 * Query Handler for Archived Nodes
 * Fetches all nodes with jmix:archived mixin from the archive folder
 */

import {ArchivedNodesQuery} from './ArchivedNodesQueryHandler.gql-queries';

import {archiveColumns} from './ArchiveManager.columns';

export const ArchivedNodesQueryHandler = {
    getQuery() {
        return ArchivedNodesQuery;
    },

    getColumns() {
        return archiveColumns;
    },

    getQueryVariables({path, lang, uilang, pagination, sort}) {
        return {
            path: path,
            language: lang,
            displayLanguage: uilang,
            offset: pagination.currentPage * pagination.pageSize,
            limit: pagination.pageSize,
            fieldSorter: sort.orderBy ? {
                sortType: sort.order === 'DESC' ? 'DESC' : 'ASC',
                fieldName: sort.orderBy,
                ignoreCase: true
            } : null
        };
    },

    getResults(data) {
        // Always return a valid structure, even if query fails or path doesn't exist
        const children = data?.jcr?.nodeByPath?.children;
        if (!children) {
            return {
                nodes: [],
                pageInfo: {totalCount: 0, nodesCount: 0}
            };
        }

        return children;
    },

    getFragments() {
        return [];
    },

    structureData(parentPath, result) {
        // Result already has the correct structure from getResults (children object with nodes and pageInfo)
        return {
            ...result,
            nodes: result?.nodes || []
        };
    },

    isStructured: () => false
};
