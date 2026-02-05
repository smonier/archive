/**
 * Archive service - handles all archive operations
 */
import {
    GET_NODE_INFO,
    CHECK_ARCHIVE_FOLDER,
    GET_CURRENT_USER,
    CHECK_PATH_EXISTS,
    GET_SITE_INFO
} from '../graphql/queries';

import {
    CREATE_ARCHIVE_FOLDER,
    CREATE_FOLDER,
    ADD_MIXIN,
    SET_PROPERTIES,
    MOVE_NODE
} from '../graphql/mutations';

import {
    getArchiveFolderPath,
    getArchiveDestinationPath,
    isNodePublished,
    isNodeArchived,
    generateUniqueName,
    formatJCRDate,
    executeGraphQL,
    debugLog
} from '../utils/archiveUtils';

/**
 * Archive service class
 */
class ArchiveService {
    /**
     * Get current UI language
     */
    getCurrentLanguage() {
        // Try multiple sources for current language
        if (window.contextJsParameters?.uilang) {
            return window.contextJsParameters.uilang;
        }

        if (window.contextJsParameters?.lang) {
            return window.contextJsParameters.lang;
        }

        // Fallback to browser language or 'en'
        return navigator.language?.split('-')[0] || 'en';
    }

    /**
     * Get node information
     */
    async getNodeInfo(path) {
        debugLog('Fetching node info for:', path);
        const language = this.getCurrentLanguage();
        const data = await executeGraphQL(GET_NODE_INFO, {path, language});
        return data.jcr?.nodeByPath;
    }

    /**
     * Get site information from node path
     */
    async getSiteInfo(path) {
        debugLog('Fetching site info for:', path);
        const data = await executeGraphQL(GET_SITE_INFO, {path});
        return data.jcr?.nodeByPath?.site;
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        debugLog('Fetching current user');
        const data = await executeGraphQL(GET_CURRENT_USER);
        return data.currentUser;
    }

    /**
     * Check if path exists
     */
    async checkPathExists(path) {
        try {
            debugLog('Checking if path exists:', path);
            const data = await executeGraphQL(CHECK_PATH_EXISTS, {path});
            return Boolean(data.jcr?.nodeByPath);
        } catch {
            return false;
        }
    }

    /**
     * Check if archive folder exists
     */
    async checkArchiveFolderExists(archiveFolderPath) {
        try {
            debugLog('Checking archive folder:', archiveFolderPath);
            const data = await executeGraphQL(CHECK_ARCHIVE_FOLDER, {path: archiveFolderPath});
            return Boolean(data.jcr?.nodeByPath);
        } catch {
            return false;
        }
    }

    /**
     * Create archive folder
     */
    async createArchiveFolder(siteKey) {
        const parentPath = `/sites/${siteKey}/contents`;
        const folderName = 'archive';

        debugLog('Creating archive folder at:', `${parentPath}/${folderName}`);

        const data = await executeGraphQL(CREATE_ARCHIVE_FOLDER, {
            parentPath,
            name: folderName,
            primaryNodeType: 'jnt:archiveContentFolder'
        });

        return data.jcr?.addNode;
    }

    /**
     * Create intermediate folders (year/month) for autosplit structure
     */
    async ensureDateFoldersExist(archiveFolderPath, date = new Date()) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');

        // Check/create year folder
        const yearPath = `${archiveFolderPath}/${year}`;
        const yearExists = await this.checkPathExists(yearPath);

        if (!yearExists) {
            debugLog('Creating year folder:', yearPath);
            await executeGraphQL(CREATE_FOLDER, {
                parentPath: archiveFolderPath,
                name: year
            });
        }

        // Check/create month folder
        const monthPath = `${yearPath}/${month}`;
        const monthExists = await this.checkPathExists(monthPath);

        if (!monthExists) {
            debugLog('Creating month folder:', monthPath);
            await executeGraphQL(CREATE_FOLDER, {
                parentPath: yearPath,
                name: month
            });
        }

        return monthPath;
    }

    /**
     * Add archived mixin to node
     */
    async addArchivedMixin(path) {
        debugLog('Adding archived mixin to:', path);
        await executeGraphQL(ADD_MIXIN, {
            path,
            mixins: ['jmix:archived']
        });
    }

    /**
     * Set archive properties on node
     */
    async setArchiveProperties(path, originalPath, originalParentId, userUuid) {
        debugLog('Setting archive properties on:', path);

        const now = formatJCRDate();

        await executeGraphQL(SET_PROPERTIES, {
            path,
            archived: 'true',
            archivedAt: now,
            archivedBy: userUuid,
            originalPath,
            originalParentId
        });
    }

    /**
     * Move node to archive destination
     */
    async moveNode(nodeUuid, destParentPath, originalName) {
        debugLog('Moving node to:', destParentPath);

        try {
            // Try with original name first
            const result = await executeGraphQL(MOVE_NODE, {
                pathOrId: nodeUuid,
                destParentPath,
                destName: null // Keep original name
            });

            return result.jcr?.moveNode?.node;
        } catch (error) {
            // If name collision, try with unique name
            if (error.message.includes('already exists') || error.message.includes('collision')) {
                debugLog('Name collision detected, generating unique name');
                const uniqueName = generateUniqueName(originalName);

                const result = await executeGraphQL(MOVE_NODE, {
                    pathOrId: nodeUuid,
                    destParentPath,
                    destName: uniqueName
                });

                return result.jcr?.moveNode?.node;
            }

            throw error;
        }
    }

    /**
     * Main archive operation
     * @param {string} nodePath - Path of the node to archive
     * @returns {Object} Result object with success status and details
     */
    async archiveNode(nodePath) {
        try {
            // Step 1: Get node information
            const nodeInfo = await this.getNodeInfo(nodePath);

            if (!nodeInfo) {
                throw new Error('Node not found');
            }

            // Step 2: Check if already archived
            if (isNodeArchived(nodeInfo)) {
                return {
                    success: false,
                    alreadyArchived: true,
                    message: 'This content is already archived',
                    nodeInfo
                };
            }

            // Step 3: Check if published
            if (isNodePublished(nodeInfo)) {
                return {
                    success: false,
                    isPublished: true,
                    message: 'Cannot archive published content. Please unpublish first.',
                    nodeInfo
                };
            }

            // Step 4: Get site information
            const siteInfo = await this.getSiteInfo(nodePath);
            if (!siteInfo) {
                throw new Error('Unable to determine site information');
            }

            const siteKey = siteInfo.name;

            // Step 5: Ensure archive folder exists
            const archiveFolderPath = getArchiveFolderPath(siteKey);
            const archiveFolderExists = await this.checkArchiveFolderExists(archiveFolderPath);

            if (!archiveFolderExists) {
                debugLog('Archive folder does not exist, creating...');
                await this.createArchiveFolder(siteKey);
            }

            // Step 6: Ensure date folders exist
            const destinationPath = await this.ensureDateFoldersExist(archiveFolderPath);

            // Step 7: Get current user
            const currentUser = await this.getCurrentUser();
            if (!currentUser?.node?.uuid) {
                throw new Error('Unable to determine current user');
            }

            // Step 8: Store original location info
            const originalPath = nodeInfo.path;
            const originalParentId = nodeInfo.parent?.uuid;

            // Step 9: Add archived mixin (before move)
            await this.addArchivedMixin(nodePath);

            // Step 10: Set archive properties (before move)
            await this.setArchiveProperties(
                nodePath,
                originalPath,
                originalParentId,
                currentUser.node.uuid
            );

            // Step 11: Move node to archive
            const movedNode = await this.moveNode(
                nodeInfo.uuid,
                destinationPath,
                nodeInfo.name
            );

            debugLog('Archive operation completed successfully');

            return {
                success: true,
                message: 'Content archived successfully',
                originalPath,
                archivePath: movedNode.path,
                destinationPath
            };
        } catch (error) {
            console.error('[ArchiveService] Archive operation failed:', error);
            throw error;
        }
    }

    /**
     * Validate if node can be archived (pre-check before confirmation)
     */
    async validateArchive(nodePath) {
        try {
            const nodeInfo = await this.getNodeInfo(nodePath);

            if (!nodeInfo) {
                return {
                    canArchive: false,
                    reason: 'notFound',
                    message: 'Content not found'
                };
            }

            if (isNodeArchived(nodeInfo)) {
                return {
                    canArchive: false,
                    reason: 'alreadyArchived',
                    message: 'Content is already archived',
                    nodeInfo
                };
            }

            if (isNodePublished(nodeInfo)) {
                return {
                    canArchive: false,
                    reason: 'published',
                    message: 'Content is published and must be unpublished first',
                    nodeInfo
                };
            }

            // Get preview of destination
            const siteInfo = await this.getSiteInfo(nodePath);
            const archiveFolderPath = getArchiveFolderPath(siteInfo.name);
            const destinationPath = getArchiveDestinationPath(archiveFolderPath);

            return {
                canArchive: true,
                nodeInfo,
                destinationPreview: destinationPath
            };
        } catch (error) {
            console.error('[ArchiveService] Validation failed:', error);
            return {
                canArchive: false,
                reason: 'error',
                message: error.message || 'Validation failed'
            };
        }
    }
}

export default new ArchiveService();
