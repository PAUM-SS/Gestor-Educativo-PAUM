import { Button } from "./Buttons";

interface PanelFooterProps {
    isEditing: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    onClose?: () => void;
    isDeleting?: boolean;
    isSaving?: boolean;
    editLabel?: string;
    deleteLabel?: string;
    saveLabel?: string;
    cancelLabel?: string;
    closeLabel?: string;
    className?: string;
    leftActions?: React.ReactNode;
    rightActions?: React.ReactNode;
}

export function PanelFooter({
    isEditing,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    onClose,
    isDeleting = false,
    isSaving = false,
    editLabel,
    deleteLabel,
    saveLabel,
    cancelLabel,
    closeLabel,
    className = '',
    leftActions,
    rightActions,
}: PanelFooterProps) {
    const handleCancelOrClose = isEditing ? (onCancel || onClose) : (onClose || onCancel);
    const cancelOrCloseLabel = isEditing
        ? (cancelLabel ?? 'Cancelar')
        : (closeLabel ?? 'Cerrar');

    return (
        <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center ${className}`}>
            <div className="flex gap-2 items-center">
                {!isEditing ? (
                    <>
                        {onEdit && (
                            <Button
                                buttonConfig="edit"
                                onClick={onEdit}
                                label={editLabel}
                            />
                        )}
                        {onDelete && (
                            <Button
                                buttonConfig="delete"
                                onClick={onDelete}
                                loading={isDeleting}
                                label={deleteLabel}
                            />
                        )}
                    </>
                ) : (
                    onSave && (
                        <Button
                            buttonConfig="save"
                            onClick={onSave}
                            loading={isSaving}
                            label={saveLabel}
                        />
                    )
                )}
                {leftActions}
            </div>
            <div className="flex gap-2 items-center">
                {rightActions}
                {handleCancelOrClose && (
                    <Button
                        buttonConfig="close"
                        onClick={handleCancelOrClose}
                        label={cancelOrCloseLabel}
                    />
                )}
            </div>
        </div>
    );
}