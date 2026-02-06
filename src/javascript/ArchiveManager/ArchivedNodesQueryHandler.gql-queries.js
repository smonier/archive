import gql from 'graphql-tag';

// Query for archived nodes with all required fields
export const ArchivedNodesQuery = gql`
    query ArchivedNodesQuery($path: String!, $language: String!, $displayLanguage: String!, $offset: Int, $limit: Int, $fieldSorter: InputFieldSorterInput) {
        jcr(workspace: EDIT) {
            nodeByPath(path: $path) {
                name
                displayName(language: $language)
                createdBy: property(name: "jcr:createdBy") {
                    value
                }
                created: property(name: "jcr:created") {
                    value
                }
                primaryNodeType {
                    name
                    displayName(language: $displayLanguage)
                    icon
                }
                mixinTypes {
                    name
                }
                operationsSupport {
                    lock
                    markForDeletion
                    publication
                }
                aggregatedPublicationInfo(language: $language, references: false, subNodes: false) {
                    publicationStatus
                    existsInLive
                }
                lockOwner: property(name: "jcr:lockOwner") {
                    value
                }
                site {
                    uuid
                    workspace
                    path
                }
                parent {
                    uuid
                    workspace
                    path
                    name
                }
                uuid
                workspace
                path
                children(
                    typesFilter: {types: ["jmix:archived"]}
                    offset: $offset
                    limit: $limit
                    fieldSorter: $fieldSorter
                ) {
                    pageInfo {
                        totalCount
                        nodesCount
                    }
                    nodes {
                        name
                        displayName(language: $language)
                        createdBy: property(name: "jcr:createdBy") {
                            value
                        }
                        created: property(name: "jcr:created") {
                            value
                        }
                        primaryNodeType {
                            name
                            displayName(language: $displayLanguage)
                            icon
                        }
                        mixinTypes {
                            name
                        }
                        operationsSupport {
                            lock
                            markForDeletion
                            publication
                        }
                        aggregatedPublicationInfo(language: $language, references: false, subNodes: false) {
                            publicationStatus
                            existsInLive
                        }
                        lockOwner: property(name: "jcr:lockOwner") {
                            value
                        }
                        site {
                            uuid
                            workspace
                            path
                        }
                        parent {
                            uuid
                            workspace
                            path
                            name
                        }
                        uuid
                        workspace
                        path
                        originalPath: property(name: "originalPath") {
                            value
                        }
                        archivedAt: property(name: "archivedAt") {
                            value
                        }
                        archivedBy: property(name: "archivedBy") {
                            value
                        }
                    }
                }
            }
        }
    }
`;
