import { Injectable } from '@angular/core';

export interface FileSelectResult {
  /** The added files, emitted in the filesAdded event. */
  addedFiles: File[];

  /** The rejected files, emitted in the filesRejected event. */
  rejectedFiles: RejectedFile[];
}

export interface RejectedFile extends File {
  /** The reason the file was rejected. */
  reason?: RejectReason;
}

export type RejectReason = 'type' | 'size' | 'no_multiple';

/**
 * This service contains the filtering logic to be applied to
 * any dropped or selected file. If a file matches all criteria
 * like maximum size or accept type, it will be emitted in the
 * addedFiles array, otherwise in the rejectedFiles array.
 */
@Injectable({ providedIn: 'root' })
export class NgxDropzoneService {
  parseFileList(
    files: FileList,
    accept: string,
    maxFileSize: number | null | undefined,
    multiple: boolean
  ): FileSelectResult {
    const addedFiles: File[] = [];
    const rejectedFiles: RejectedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)!;

      if (!this.isAccepted(file, accept)) {
        this.rejectFile(rejectedFiles, file, 'type');
        continue;
      }

      if (maxFileSize && file.size > maxFileSize) {
        this.rejectFile(rejectedFiles, file, 'size');
        continue;
      }

      if (!multiple && addedFiles.length >= 1) {
        this.rejectFile(rejectedFiles, file, 'no_multiple');
        continue;
      }

      addedFiles.push(file);
    }

    const result: FileSelectResult = {
      addedFiles,
      rejectedFiles,
    };

    return result;
  }

  private isAccepted(file: File, accept: string): boolean {
    if (accept === '*') {
      return true;
    }

    // Sanitize filename first
    const safeName = this.sanitizeFilename(file.name);
    const filename = safeName.toLowerCase();
    const filetype = file.type.toLowerCase();

    const acceptFiletypes = accept
      .split(',')
      .map((it) => it.toLowerCase().trim())
      .filter((it) => it.length > 0); // Remove empty strings

    return acceptFiletypes.some((acceptFiletype) => {
      // Wildcard MIME (more restrictive).
      if (acceptFiletype.endsWith('/*')) {
        const [acceptMain] = acceptFiletype.split('/');
        const [fileMain] = filetype.split('/');
        return acceptMain === fileMain && acceptMain.length > 0;
      }

      // Extension check - get LAST extension only.
      if (acceptFiletype.startsWith('.')) {
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1) return false;
        const ext = filename.substring(lastDot);
        return ext === acceptFiletype;
      }

      // Exact MIME match
      return acceptFiletype === filetype;
    });
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special chars
      .replace(/\.{2,}/g, '.') // No ".."
      .replace(/\0/g, '') // Remove null bytes
      .substring(0, 255); // Limit length
  }

  private rejectFile(
    rejectedFiles: RejectedFile[],
    file: File,
    reason: RejectReason
  ) {
    const rejectedFile = file as RejectedFile;
    rejectedFile.reason = reason;

    rejectedFiles.push(rejectedFile);
  }
}
