/**
 * Global Dialog Manager
 * Manages dialogs that persist outside component lifecycle
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography
} from '@mui/material';

class DialogManager {
    constructor() {
        this.container = null;
        this.root = null;
    }

    initialize() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'archive-dialog-container';
            document.body.appendChild(this.container);
            this.root = ReactDOM.createRoot(this.container);
        }
    }

    showPublishedWarningDialog({nodeInfo, publishedLanguages}) {
        this.initialize();

        const handleClose = () => {
            this.hideDialog();
        };

        const DialogComponent = () => (
            <Dialog fullWidth open maxWidth="sm" onClose={handleClose}>
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
                    {publishedLanguages && publishedLanguages.length > 0 && (
                        <Typography variant="body2" sx={{mt: 2}}>
                            <strong>Published in languages:</strong> {publishedLanguages.map(l => l.language.toUpperCase()).join(', ')}
                        </Typography>
                    )}
                    <Typography variant="body2" color="error" sx={{mt: 2}}>
                        Please unpublish this content in all languages before archiving.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>
        );

        this.root.render(<DialogComponent/>);
    }

    showConfirmDialog({nodeInfo, destinationPreview, onConfirm}) {
        this.initialize();

        const handleClose = () => {
            this.hideDialog();
        };

        const handleConfirm = () => {
            this.hideDialog();
            if (onConfirm) {
                onConfirm();
            }
        };

        const DialogComponent = () => (
            <Dialog fullWidth open maxWidth="sm" onClose={handleClose}>
                <DialogTitle>Archive Content</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to archive this content?
                    </DialogContentText>
                    <Typography variant="body2" sx={{mt: 2}}>
                        <strong>Content:</strong> {nodeInfo?.displayName || nodeInfo?.name}
                    </Typography>
                    <Typography variant="body2">
                        <strong>From:</strong> {nodeInfo?.path}
                    </Typography>
                    <Typography variant="body2">
                        <strong>To:</strong> {destinationPreview}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
                        The content will be moved to the archive folder and marked with the archived mixin.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" color="primary" onClick={handleConfirm}>
                        Archive
                    </Button>
                </DialogActions>
            </Dialog>
        );

        this.root.render(<DialogComponent/>);
    }

    showRestoreConfirmDialog({nodeInfo, archiveInfo, parentExists, customParentPath = null, onConfirm, onSelectParent}) {
        this.initialize();

        const handleClose = () => {
            this.hideDialog();
        };

        const handleConfirm = () => {
            if (onConfirm) {
                onConfirm(customParentPath);
            }
        };

        const handleSelectParent = () => {
            if (onSelectParent) {
                onSelectParent();
            }
        };

        const targetPath = customParentPath || archiveInfo.originalParentPath;
        const targetName = customParentPath ? 'Selected location' : 'Original location';

        const DialogComponent = () => (
            <Dialog fullWidth open maxWidth="md" onClose={handleClose}>
                <DialogTitle>Restore Archived Content</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Review the archive information and confirm the restore operation.
                    </DialogContentText>

                    <Typography variant="subtitle2" sx={{mt: 3, mb: 1}}>
                        Content Information
                    </Typography>
                    <Typography variant="body2">
                        <strong>Name:</strong> {nodeInfo?.displayName || nodeInfo?.name}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Current path:</strong> {nodeInfo?.path}
                    </Typography>

                    <Typography variant="subtitle2" sx={{mt: 2, mb: 1}}>
                        Archive Information
                    </Typography>
                    <Typography variant="body2">
                        <strong>Archived at:</strong> {archiveInfo.archivedAt ? new Date(archiveInfo.archivedAt).toLocaleString() : 'Unknown'}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Original path:</strong> {archiveInfo.originalPath || 'Unknown'}
                    </Typography>

                    <Typography variant="subtitle2" sx={{mt: 2, mb: 1}}>
                        Restore Destination
                    </Typography>
                    {!parentExists && !customParentPath ? (
                        <>
                            <Typography variant="body2" color="warning.main">
                                <strong>⚠️ Original parent location no longer exists</strong>
                            </Typography>
                            <Typography variant="body2" sx={{mt: 1}}>
                                The original parent path has been deleted or moved. Please select a new location for this content.
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="body2">
                                <strong>{targetName}:</strong> {targetPath}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                                The content will be moved to this location and the archived mixin will be removed.
                            </Typography>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    {!parentExists && !customParentPath ? (
                        <Button variant="contained" color="primary" onClick={handleSelectParent}>
                            Select Location
                        </Button>
                    ) : (
                        <>
                            {parentExists && !customParentPath && (
                                <Button onClick={handleSelectParent}>
                                    Choose Different Location
                                </Button>
                            )}
                            <Button variant="contained" color="primary" onClick={handleConfirm}>
                                Restore
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        );

        this.root.render(<DialogComponent/>);
    }

    showPathPickerDialog({nodeInfo, onConfirm}) {
        this.initialize();

        const handleClose = () => {
            this.hideDialog();
        };

        const handleOpenPicker = () => {
            // Close the current dialog
            this.hideDialog();

            // Open Jahia content picker
            window.CE_API.openPicker({
                type: 'editorial',
                initialSelectedItem: [],
                site: window.jahiaGWTParameters?.siteKey || window.contextJsParameters?.siteKey,
                lang: window.jahiaGWTParameters?.uilang || window.contextJsParameters?.uilang,
                isMultiple: false,
                setValue: ([selected]) => {
                    if (selected?.path && onConfirm) {
                        onConfirm(selected.path);
                    }
                }
            });
        };

        const DialogComponent = () => (
            <Dialog fullWidth open maxWidth="sm" onClose={handleClose}>
                <DialogTitle>Select Restore Location</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select the location where you want to restore this content.
                    </DialogContentText>
                    <Typography variant="body2" sx={{mt: 2, mb: 2}}>
                        <strong>Content:</strong> {nodeInfo?.displayName || nodeInfo?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Click &quot;Select Location&quot; to open the content picker and choose a destination folder.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenPicker}
                    >
                        Select Location
                    </Button>
                </DialogActions>
            </Dialog>
        );

        this.root.render(<DialogComponent/>);
    }

    hideDialog() {
        if (this.root) {
            this.root.render(null);
        }
    }

    cleanup() {
        if (this.root) {
            this.root.unmount();
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        this.container = null;
        this.root = null;
    }
}

// Create singleton instance
const dialogManager = new DialogManager();

export default dialogManager;
