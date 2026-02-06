/**
 * GraphQL mutations for archive content extension
 */

/**
 * Mutation to create the archive folder
 */
export const CREATE_ARCHIVE_FOLDER = `
  mutation CreateArchiveFolder($parentPath: String!, $name: String!, $primaryNodeType: String!) {
    jcr(workspace: EDIT) {
      addNode(
        name: $name
        parentPathOrId: $parentPath
        primaryNodeType: $primaryNodeType
      ) {
        uuid
        node {
          path
          name
        }
      }
    }
  }
`;

/**
 * Mutation to create intermediate folders (year/month) for autosplit structure
 */
export const CREATE_FOLDER = `
  mutation CreateFolder($parentPath: String!, $name: String!) {
    jcr(workspace: EDIT) {
      addNode(
        name: $name
        parentPathOrId: $parentPath
        primaryNodeType: "jnt:archiveContentFolder"
      ) {
        uuid
        node {
          path
          name
        }
      }
    }
  }
`;

/**
 * Mutation to add mixin to a node
 */
export const ADD_MIXIN = `
  mutation AddMixin($path: String!, $mixins: [String]!) {
    jcr(workspace: EDIT) {
      mutateNode(pathOrId: $path) {
        addMixins(mixins: $mixins)
      }
    }
  }
`;

/**
 * Mutation to set properties on a node
 */
export const SET_PROPERTIES = `
  mutation SetProperties(
    $path: String!
    $archived: String!
    $archivedAt: String!
    $archivedBy: String!
    $originalPath: String!
    $originalParentId: String!
  ) {
    jcr(workspace: EDIT) {
      mutateNode(pathOrId: $path) {
        mutateProperty(name: "archived") {
          setValue(value: $archived, type: BOOLEAN)
        }
        archivedAt: mutateProperty(name: "archivedAt") {
          setValue(value: $archivedAt, type: DATE)
        }
        archivedBy: mutateProperty(name: "archivedBy") {
          setValue(value: $archivedBy, type: WEAKREFERENCE)
        }
        originalPath: mutateProperty(name: "originalPath") {
          setValue(value: $originalPath, type: STRING)
        }
        originalParentId: mutateProperty(name: "originalParentId") {
          setValue(value: $originalParentId, type: STRING)
        }
      }
    }
  }
`;

/**
 * Mutation to move a node to a new location
 */
export const MOVE_NODE = `
  mutation MoveNode($pathOrId: String!, $destParentPathOrId: String!, $destName: String) {
    jcr(workspace: EDIT) {
      moveNode(
        pathOrId: $pathOrId
        destParentPathOrId: $destParentPathOrId
        destName: $destName
      ) {
        node {
          uuid
          path
          name
          primaryNodeType {
            name
          }
        }
      }
    }
  }
`;

/**
 * Mutation to set permissions (deny write) to make content read-only
 * This grants read but denies write for the "editors" role
 */
export const SET_READ_ONLY_PERMISSIONS = `
  mutation SetReadOnlyPermissions($path: String!) {
    jcr(workspace: EDIT) {
      mutateNode(pathOrId: $path) {
        addMixins(mixins: ["jmix:accessControlled"])
      }
    }
  }
`;

/**
 * Alternative: Add a marker mixin that can be used by Jahia to enforce read-only
 */
export const ADD_READ_ONLY_MIXIN = `
  mutation AddReadOnlyMixin($path: String!) {
    jcr(workspace: EDIT) {
      mutateNode(pathOrId: $path) {
        addMixins(mixins: ["jmix:markedForDeletion"])
      }
    }
  }
`;
