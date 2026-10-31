import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn.js';
import { MAX_FILE_BYTES, MAX_FILES, ACCEPTED_MIME } from '@/lib/upload.js';
import { IconButton } from './IconButton.jsx';

/**
 * The drag-and-drop uploader. Thumbnails for images; the filename and size for everything
 * else. Rejections render inline with a specific reason (DESIGN.md section 5).
 */
export function FileDropzone({
  files = [],
  onAdd,
  onRemove,
  accept = ACCEPTED_MIME.join(','),
  multiple = true,
  maxFiles = MAX_FILES,
  hint,
  camera = false,
  className,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState([]);

  const slotsLeft = Math.max(0, maxFiles - files.length);

  const validate = (list) => {
    const kept = [];
    const rejected = [];
    for (const file of list) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        rejected.push(`${file.name}: not a JPG, PNG, WebP or PDF.`);
      } else if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name}: larger than 5 MB.`);
      } else {
        kept.push(file);
      }
    }
    return { kept: kept.slice(0, slotsLeft), rejected };
  };

  const handleFiles = (list) => {
    const { kept, rejected } = validate(Array.from(list));
    setErrors(rejected);
    if (kept.length) onAdd?.(kept);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <label
        htmlFor="file-dropzone-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-sun bg-amber-soft' : 'border-line bg-paper hover:border-sun/60',
        )}
      >
        <Upload size={22} className="text-muted" aria-hidden="true" />
        <p className="text-body text-ink">
          {dragOver ? 'Drop to upload' : 'Drag files here or tap to choose'}
        </p>
        <p className="text-small text-muted">
          {hint ?? 'JPG, PNG, WebP or PDF, up to 5 MB each'}
        </p>
        <input
          ref={inputRef}
          id="file-dropzone-input"
          type="file"
          multiple={multiple}
          accept={accept}
          capture={camera ? 'environment' : undefined}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="rounded-input border border-alert-soft bg-alert-soft/40 p-2.5">
          {errors.map((err, i) => (
            <li key={i} className="text-small text-alert">
              {err}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file, i) => (
            <li
              key={file.name + i}
              className="group relative overflow-hidden rounded-input border border-line bg-surface"
            >
              {file.type?.startsWith('image/') && file instanceof File ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-ink-tint text-micro uppercase text-muted">
                  {file.name?.split('.').pop() ?? 'file'}
                </div>
              )}
              <div className="flex items-start justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-small text-ink">{file.name}</p>
                  {file.size !== undefined && (
                    <p className="text-micro text-muted tnum">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
                {onRemove && (
                  <IconButton
                    icon={X}
                    label={`Remove ${file.name}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemove(file, i)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

