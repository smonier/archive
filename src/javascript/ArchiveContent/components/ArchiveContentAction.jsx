/**
 * Archive Content Action Component
 * Jahia UI Extension for archiving content from Content Actions menu
 */
import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {registry} from '@jahia/ui-extender';
import {Archive} from '@jahia/moonstone';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography
} from '@mui/material';
import ArchiveService from '../services/ArchiveService';
import {getErrorMessage} from '../utils/archiveUtils';

/**
 * Show notification to user
 */
const showNotification = (message, variant = 'info') => {
    if (window.jahia && window.jahia.toastDispatcher) {
        window.jahia.toastDispatcher.add({
            message,
            variant
        });
    } else {
        console.log(`[Archive] ${message}`);
    }
};

/**
 * Confirmation Dialog Component
 */
const ArchiveConfirmDialog = ({open, onClose, onConfirm, nodeInfo, destinationPreview, isLoading}) => (
    <Dialog fullWidth open={open} maxWidth="sm" onClose={onClose}>
        <DialogTitle>Archive Content</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Are you sure you want to archive this content?
            </DialogContentText>
            <Typography variant="body2" sx={{mt: 2}}>
                <strong>Content:</strong> {nodeInfo?.displayName || nodeInfo?.name}
            </Typography>
            <Typography variant="body2">
                <strong>Current path:</strong> {nodeInfo?.path}
            </Typography>
            <Typography variant="body2" sx={{mt: 1}}>
                <strong>Archive destination:</strong> {destinationPreview}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{mt: 2, display: 'block'}}>
                The content will be moved to the archive folder and marked as read-only.
                Original location information will be preserved.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button disabled={isLoading} onClick={onClose}>Cancel</Button>
            <Button color="error" variant="contained" disabled={isLoading} onClick={onConfirm}>
                Archive
            </Button>
        </DialogActions>
    </Dialog>
);

ArchiveConfirmDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    nodeInfo: PropTypes.object,
    destinationPreview: PropTypes.string,
    isLoading: PropTypes.bool
};

/**
 * Warning Dialog for Published Content
 */
const PublishedWarningDialog = ({open, onClose, nodeInfo}) => (
    <Dialog fullWidth open={open} maxWidth="sm" onClose={onClose}>
        <DialogTitle>Cannot Archive Published Content</DialogTitle>
        <DialogContent>
            <DialogContentText>
                This content is currently published and cannot be archived.
            </DialogContentText>
            <Typography variant="body2" sx={{mt: 2}}>
                <strong>Content:</strong> {nodeInfo?.displayName || nodeInfo?.name}
            </Typography>
            <Typography variant="body2">
                <strong>Path:</strong> {nodeInfo?.path}
            </Typography>
            <Typography variant="body2" color="error" sx={{mt: 2}}>
                Please unpublish this content manually before archiving.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Close</Button>
        </DialogActions>
    </Dialog>
);

PublishedWarningDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    nodeInfo: PropTypes.object
};

/**
 * Already Archived Dialog
 */
const AlreadyArchivedDialog = ({open, onClose, nodeInfo}) => (
    <Dialog fullWidth open={open} maxWidth="sm" onClose={onClose}>
        <DialogTitle>Already Archived</DialogTitle>
        <DialogContent>
            <DialogContentText>
                This content has already been archived.
            </DialogContentText>
            <Typography variant="body2" sx={{mt: 2}}>
                <strong>Content:</strong> {nodeInfo?.displayName || nodeInfo?.name}
            </Typography>
            <Typography variant="body2">
                <strong>Path:</strong> {nodeInfo?.path}
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Close</Button>
        </DialogActions>
    </Dialog>
);

AlreadyArchivedDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    nodeInfo: PropTypes.object
};

/**
 * Main Archive Action Component
 */
export const ArchiveContentAction = ({path, render: Render, ...otherProps}) => {
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [publishedWarningOpen, setPublishedWarningOpen] = useState(false);
    const [alreadyArchivedOpen, setAlreadyArchivedOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [validationData, setValidationData] = useState(null);

    /**
     * Handle action click - validate before showing confirmation
     */
    const handleClick = async () => {
        setIsLoading(true);

        try {
            const validation = await ArchiveService.validateArchive(path);
            setValidationData(validation);

            if (!validation.canArchive) {
                if (validation.reason === 'published') {
                    setPublishedWarningOpen(true);
                } else if (validation.reason === 'alreadyArchived') {
                    setAlreadyArchivedOpen(true);
                } else {
                    showNotification(validation.message || 'Cannot archive this content', 'error');
                }

                setIsLoading(false);
                return;
            }

            // Show confirmation dialog
            setConfirmDialogOpen(true);
            setIsLoading(false);
        } catch (error) {
            console.error('[ArchiveContent] Validation error:', error);
            showNotification(getErrorMessage(error), 'error');
            setIsLoading(false);
        }
    };

    /**
     * Handle confirmed archive action
     */
    const handleConfirmArchive = async () => {
        setIsLoading(true);

        try {
            const result = await ArchiveService.archiveNode(path);

            if (result.success) {
                showNotification(`Content archived successfully to ${result.destinationPath}`, 'success');
                setConfirmDialogOpen(false);

                // Trigger content refresh if possible
                if (otherProps.refetch) {
                    otherProps.refetch();
                }
            } else {
                showNotification(result.message || 'Archive operation failed', 'error');
            }
        } catch (error) {
            console.error('[ArchiveContent] Archive error:', error);
            showNotification(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
            setConfirmDialogOpen(false);
        }
    };

    /**
     * Close all dialogs
     */
    const handleCloseDialogs = () => {
        setConfirmDialogOpen(false);
        setPublishedWarningOpen(false);
        setAlreadyArchivedOpen(false);
        setValidationData(null);
    };

    // If render function provided, use it (for menu rendering)
    if (Render) {
        return (
            <>
                <Render {...otherProps} onClick={handleClick}/>

                {validationData?.canArchive && (
                    <ArchiveConfirmDialog
                        open={confirmDialogOpen}
                        nodeInfo={validationData.nodeInfo}
                        destinationPreview={validationData.destinationPreview}
                        isLoading={isLoading}
                        onClose={handleCloseDialogs}
                        onConfirm={handleConfirmArchive}
                    />
                )}

                {validationData?.nodeInfo && (
                    <>
                        <PublishedWarningDialog
                            open={publishedWarningOpen}
                            nodeInfo={validationData.nodeInfo}
                            onClose={handleCloseDialogs}
                        />
                        <AlreadyArchivedDialog
                            open={alreadyArchivedOpen}
                            nodeInfo={validationData.nodeInfo}
                            onClose={handleCloseDialogs}
                        />
                    </>
                )}
            </>
        );
    }

    // This shouldn't happen with proper registration, but provide a fallback
    return null;
};

ArchiveContentAction.propTypes = {
    path: PropTypes.string.isRequired,
    render: PropTypes.func
};

/**
 * Register the action in Jahia UI Extensions
 */
export const registerArchiveAction = () => {
    registry.add('action', 'archiveContent', {
        targets: ['contentActions:999'],
        buttonIcon: <Archive/>,
        buttonLabel: 'archive:archive.label.archiveContent',
        showOnNodeTypes: ['jnt:page', 'jnt:content'],
        requiredPermission: 'archiveContent',
        component: ArchiveContentAction
    });

    console.info('[ArchiveContent] Archive action registered');
};

export default ArchiveContentAction;
