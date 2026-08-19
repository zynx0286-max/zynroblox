import { useState, useRef, type FormEvent } from "react";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = "*",
  maxSize = 50,
  multiple = true,
  onFilesSelected,
  disabled = false,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateFiles = (fileList: FileList): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    Array.from(fileList).forEach((file) => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        newErrors.push(`${file.name} exceeds ${maxSize}MB limit`);
        return;
      }

      // Check file type
      if (accept !== "*") {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith(".")) {
            return file.name.endsWith(type);
          }
          if (type.endsWith("/*")) {
            const [mainType] = type.split("/");
            return file.type.startsWith(mainType);
          }
          return file.type === type;
        });

        if (!isAccepted) {
          newErrors.push(`${file.name} is not an accepted file type`);
          return;
        }
      }

      validFiles.push(file);
    });

    return { valid: validFiles, errors: newErrors };
  };

  const handleFiles = async (fileList: FileList) => {
    const { valid, errors: newErrors } = validateFiles(fileList);

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const toAdd = multiple ? valid : [valid[0]];
    setFiles((prev) => [...prev, ...toAdd]);
    setErrors([]);

    try {
      setUploading(true);
      await onFilesSelected(toAdd);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Upload failed"]);
    } finally {
      setUploading(false);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (input.files) {
      handleFiles(input.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          disabled
            ? "border-border/50 bg-secondary/20 text-muted-foreground/50"
            : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10",
          dragCounterRef.current > 0 && !disabled && "border-primary/60 bg-primary/15",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center gap-2">
          <Upload className="size-8 text-primary opacity-60" />
          <div>
            <p className="font-display font-semibold text-foreground">Drag files here or click</p>
            <p className="text-xs text-muted-foreground">
              Max {maxSize}MB • {accept === "*" ? "Any format" : accept}
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 hover:bg-destructive/20"
              >
                <X className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
