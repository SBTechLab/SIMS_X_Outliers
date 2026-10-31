import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';

/**
 * A confirmation built on Modal.
 *
 * The message always names the consequence in plain words (DESIGN.md section 5):
 * "Cancel project PRJ-2026-0012? Reserved stock returns to inventory and the install job
 * is removed."
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink">{message}</p>
    </Modal>
  );
}

