/**
 * Archive service - handles all archive operations
 */
import {
    FRAGMENTS,
    GET_NODE_INFO,
    CHECK_ARCHIVE_FOLDER,
    GET_CURRENT_USER,
    CHECK_PATH_EXISTS,
    GET_SITE_INFO,
    GET_SITE_LANGUAGES,
    GET_PUBLICATION_STATUS
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
    executeGraphQLSilent
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
        const data = await executeGraphQL(GET_NODE_INFO, {path});
        return data.jcr?.nodeByPath;
    }

    /**
     * Get site languages
     */
    async getSiteLanguages(path) {
        try {
            const data = await executeGraphQL(GET_SITE_LANGUAGES, {path});
            const languages = data.jcr?.nodeByPath?.site?.languages?.values;
            return languages || ['en'];
        } catch (error) {
            console.error('[ArchiveService] Error fetching site languages:', error);
            return ['en'];
        }
    }

    /**
     * Check publication status for all site languages
     */
    async getPublicationStatusForAllLanguages(path, languages) {
        const statusChecks = await Promise.all(
            languages.map(async lang => {
                try {
                    const data = await executeGraphQL(GET_PUBLICATION_STATUS, {path, language: lang});
                    const status = data.jcr?.nodeByPath?.aggregatedPublicationInfo?.publicationStatus;
                    const isPublished = status === 'PUBLISHED' || status === 'MODIFIED';
                    return {
                        language: lang,
                        status,
                        isPublished
                    };
                } catch (error) {
                    console.error(`[ArchiveService] Error checking ${lang}:`, error);
                    return {language: lang, status: 'UNKNOWN', isPublished: false};
                }
            })
        );

        return statusChecks;
    }

    /**
     * Get site information from node path
     */
    async getSiteInfo(path) {
        const data = await executeGraphQL(GET_SITE_INFO, {path});
        return data.jcr?.nodeByPath?.site;
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        const data = await executeGraphQL(GET_CURRENT_USER);
        return data.currentUser;
    }

    /**
     * Check if path exists
     */
    async checkPathExists(path) {
        try {
            const data = await executeGraphQLSilent(CHECK_PATH_EXISTS, {path});
            return Boolean(data.jcr?.nodeByPath);
        } catch (error) {
            // PathNotFoundException is expected when checking for conflicts
            if (error.message?.includes('PathNotFoundException')) {
                return false;
            }

            // For other unexpected errors, log them
            console.warn('[ArchiveService] Unexpected error checking path existence:', error);
            return false;
        }
    }

    /**
     * Check if archive folder exists
     */
    async checkArchiveFolderExists(archiveFolderPath) {
        try {
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
        const parentPath = `/sites/${siteKey}`;
        const folderName = 'Archives';

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
        let yearExists = await this.checkPathExists(yearPath);

        if (!yearExists) {
            try {
                await executeGraphQL(CREATE_FOLDER, {
                    parentPath: archiveFolderPath,
                    name: year
                });

                // Verify it was created
                yearExists = await this.checkPathExists(yearPath);
                if (!yearExists) {
                    throw new Error(`Failed to create year folder: ${yearPath}`);
                }
            } catch (error) {
                console.error('[ArchiveService] Error creating year folder:', error);
                throw error;
            }
        }

        // Check/create month folder
        const monthPath = `${yearPath}/${month}`;
        let monthExists = await this.checkPathExists(monthPath);

        if (!monthExists) {
            try {
                await executeGraphQL(CREATE_FOLDER, {
                    parentPath: yearPath,
                    name: month
                });

                // Verify it was created
                monthExists = await this.checkPathExists(monthPath);
                if (!monthExists) {
                    throw new Error(`Failed to create month folder: ${monthPath}`);
                }
            } catch (error) {
                console.error('[ArchiveService] Error creating month folder:', error);
                throw error;
            }
        }

        console.log('[ArchiveService] Date folders ready, final path:', monthPath);
        return monthPath;
    }

    /**
     * Add archived mixin to node
     */
    async addArchivedMixin(path) {
        await executeGraphQL(ADD_MIXIN, {
            path,
            mixins: ['jmix:archived']
        });
    }

    /**
     * Set archive properties on node
     */
    async setArchiveProperties(path, originalPath, originalParentId, userUuid) {
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
        try {
            // Try with original name first
            const result = await executeGraphQL(MOVE_NODE, {
                pathOrId: nodeUuid,
                destParentPathOrId: destParentPath,
                destName: null // Keep original name
            });

            return result.jcr?.moveNode?.node;
        } catch (error) {
            // If name collision, try with unique name
            if (error.message.includes('already exists') || error.message.includes('collision')) {
                const uniqueName = generateUniqueName(originalName);

                const result = await executeGraphQL(MOVE_NODE, {
                    pathOrId: nodeUuid,
                    destParentPathOrId: destParentPath,
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
            let archiveFolderExists = await this.checkArchiveFolderExists(archiveFolderPath);

            if (!archiveFolderExists) {
                await this.createArchiveFolder(siteKey);

                // Verify it was created
                archiveFolderExists = await this.checkArchiveFolderExists(archiveFolderPath);
                if (!archiveFolderExists) {
                    throw new Error('Failed to create archive folder');
                }
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

            // Check publication status in all site languages
            const siteLanguages = await this.getSiteLanguages(nodePath);
            console.log('[ArchiveService] Site languages:', siteLanguages);

            const publishedLanguages = await this.getPublicationStatusForAllLanguages(nodePath, siteLanguages);
            console.log('[ArchiveService] All publication status:', publishedLanguages);

            const hasPublishedContent = publishedLanguages.some(l => l.isPublished);
            console.log('[ArchiveService] Has published content:', hasPublishedContent);

            if (hasPublishedContent) {
                const publishedLangList = publishedLanguages.filter(l => l.isPublished);
                console.log('[ArchiveService] Published languages list:', publishedLangList);
                const result = {
                    canArchive: false,
                    reason: 'published',
                    message: 'Content is published and must be unpublished first',
                    nodeInfo,
                    publishedLanguages: publishedLangList
                };
                console.log('[ArchiveService] Returning validation result:', result);
                return result;
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

    /**
     * Get archive information for a node
     * @param {string} nodePath - Path to the archived node
     * @returns {Promise<Object>} Archive information
     */
    async getArchiveInfo(nodePath) {
        try {
            // Query in EDIT workspace where archived content exists
            const query = `
                ${FRAGMENTS}
                
                query GetArchivedNodeInfo($path: String!) {
                    jcr(workspace: EDIT) {
                        nodeByPath(path: $path) {
                            ...CoreNodeFields
                            displayName
                            properties {
                                name
                                value
                            }
                        }
                    }
                }
            `;

            const result = await executeGraphQL(query, {path: nodePath});
            // ExecuteGraphQL returns result.data, so we access jcr directly
            const node = result?.jcr?.nodeByPath;

            if (!node) {
                console.error('[ArchiveService] Node not found at path:', nodePath);
                console.error('[ArchiveService] Query result:', result);
                throw new Error(`Node not found at path: ${nodePath}`);
            }

            const isArchived = node.mixinTypes?.some(m => m.name === 'jmix:archived');
            const properties = node.properties || [];

            // Extract archive properties
            const archivedProp = properties.find(p => p.name === 'archived');
            const archivedAtProp = properties.find(p => p.name === 'archivedAt');
            const archivedByProp = properties.find(p => p.name === 'archivedBy');
            const originalPathProp = properties.find(p => p.name === 'originalPath');
            const originalParentIdProp = properties.find(p => p.name === 'originalParentId');

            // Get original parent path by looking up the parent ID
            let originalParentPath = null;
            if (originalParentIdProp?.value) {
                try {
                    const parentResult = await executeGraphQL(`
                        query GetNodeById($uuid: String!) {
                            jcr(workspace: EDIT) {
                                nodeById(uuid: $uuid) {
                                    path
                                }
                            }
                        }
                    `, {uuid: originalParentIdProp.value});
                    // ExecuteGraphQL returns result.data, so access jcr directly
                    originalParentPath = parentResult?.jcr?.nodeById?.path;
                } catch (e) {
                    console.warn('[ArchiveService] Could not find original parent:', e);
                }
            }

            return {
                isArchived,
                nodeInfo: {
                    name: node.name,
                    displayName: node.displayName,
                    path: node.path,
                    uuid: node.uuid,
                    primaryNodeType: node.primaryNodeType?.name
                },
                archived: archivedProp?.value,
                archivedAt: archivedAtProp?.value,
                archivedBy: archivedByProp?.value,
                originalPath: originalPathProp?.value,
                originalParentId: originalParentIdProp?.value,
                originalParentPath
            };
        } catch (error) {
            console.error('[ArchiveService] Failed to get archive info:', error);
            throw error;
        }
    }

    /**
     * Restore archived node to original or new location
     * @param {string} nodePath - Path to archived node
     * @param {string} targetParentPath - Path to parent where node should be restored
     * @returns {Promise<Object>} Restore result
     */
    async restoreNode(nodePath, targetParentPath) {
        try {
            console.log('[ArchiveService] Restoring node:', nodePath, 'to parent:', targetParentPath);

            // Step 1: Get node info
            const nodeResult = await executeGraphQL(GET_NODE_INFO, {path: nodePath});
            // ExecuteGraphQL returns result.data, so access jcr directly
            const node = nodeResult?.jcr?.nodeByPath;

            if (!node) {
                throw new Error('Node not found');
            }

            // Step 2: Verify target parent exists
            const parentExists = await this.checkPathExists(targetParentPath);
            if (!parentExists) {
                throw new Error('Target parent path does not exist');
            }

            // Step 3: Check if a node with same name already exists at destination
            const destinationPath = `${targetParentPath}/${node.name}`;
            const destExists = await this.checkPathExists(destinationPath);
            let finalName = node.name;

            if (destExists) {
                // Generate unique name
                finalName = await generateUniqueName(targetParentPath, node.name);
                console.log('[ArchiveService] Destination exists, using unique name:', finalName);
            }

            // Step 4: Move node to target location
            console.log('[ArchiveService] Moving node...');
            const moveResult = await executeGraphQL(MOVE_NODE, {
                pathOrId: nodePath,
                destParentPathOrId: targetParentPath,
                destName: finalName
            });

            console.log('[ArchiveService] Move result:', JSON.stringify(moveResult, null, 2));

            if (!moveResult?.jcr?.moveNode?.node) {
                console.error('[ArchiveService] Move result structure unexpected:', moveResult);
                throw new Error('Failed to move node');
            }

            const movedNodePath = moveResult.jcr.moveNode.node.path;
            console.log('[ArchiveService] Node moved to:', movedNodePath);

            // Step 5: Remove jmix:archived mixin (properties will be automatically removed)
            console.log('[ArchiveService] Removing archived mixin...');
            const removeMixinResult = await executeGraphQL(`
                mutation RemoveMixin($pathOrId: String!) {
                    jcr(workspace: EDIT) {
                        mutateNode(pathOrId: $pathOrId) {
                            removeMixins(mixins: ["jmix:archived"])
                        }
                    }
                }
            `, {pathOrId: movedNodePath});

            if (!removeMixinResult?.jcr?.mutateNode) {
                throw new Error('Failed to remove archived mixin');
            }

            console.log('[ArchiveService] Archived mixin removed successfully');

            return {
                success: true,
                destinationPath: movedNodePath,
                message: 'Content restored successfully'
            };
        } catch (error) {
            console.error('[ArchiveService] Restore failed:', error);
            return {
                success: false,
                message: error.message || 'Failed to restore content'
            };
        }
    }
}

export default new ArchiveService();
