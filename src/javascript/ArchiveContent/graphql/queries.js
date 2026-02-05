/**
 * GraphQL queries for archive content extension
 */

/**
 * Core node fragments
 */
export const FRAGMENTS = `
  fragment SimpleCoreNodeFields on JCRNode {
    workspace
    uuid
    path
    name
  }

  fragment CoreNodeFields on JCRNode {
    ...SimpleCoreNodeFields
    primaryNodeType {
      name
      supertypes {
        name
      }
    }
    mixinTypes {
      name
    }
  }
`;

/**
 * Query to fetch node information including publication status
 */
export const GET_NODE_INFO = `
  ${FRAGMENTS}
  
  query GetNodeInfo($path: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        ...CoreNodeFields
        displayName
        parent {
          ...SimpleCoreNodeFields
        }
        properties {
          name
          value
        }
        aggregatedPublicationInfo(language: $language) {
          publicationStatus
        }
        isPublished: property(name: "j:published", language: $language) {
          value
        }
        archivedProp: property(name: "archived") {
          value
        }
      }
    }
  }
`;

/**
 * Query to check if archive folder exists
 */
export const CHECK_ARCHIVE_FOLDER = `
  ${FRAGMENTS}
  
  query CheckArchiveFolder($path: String!) {
    jcr {
      nodeByPath(path: $path) {
        ...CoreNodeFields
      }
    }
  }
`;

/**
 * Query to get current user information
 */
export const GET_CURRENT_USER = `
  query GetCurrentUser {
    currentUser {
      name
      node {
        uuid
        path
      }
    }
  }
`;

/**
 * Query to check if destination path exists (for autosplit folders)
 */
export const CHECK_PATH_EXISTS = `
  ${FRAGMENTS}
  
  query CheckPathExists($path: String!) {
    jcr {
      nodeByPath(path: $path) {
        ...CoreNodeFields
      }
    }
  }
`;

/**
 * Query to get site key from a node path
 */
export const GET_SITE_INFO = `
  ${FRAGMENTS}
  
  query GetSiteInfo($path: String!) {
    jcr {
      nodeByPath(path: $path) {
        ...CoreNodeFields
        site {
          name
          path
        }
      }
    }
  }
`;
