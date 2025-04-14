import {
  Component,
  HostListener,
  ElementRef,
  output,
  input,
  inject,
  Injector,
  viewChild,
  contentChildren,
  computed,
  booleanAttribute,
  numberAttribute,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { preventDefault } from '../helpers';
import { NgxDropzonePreviewComponent } from '../ngx-dropzone-preview/ngx-dropzone-preview.component';

import type { RejectedFile } from './ngx-dropzone.service';

export interface NgxDropzoneChangeEvent {
  source: NgxDropzoneComponent;
  addedFiles: File[];
  rejectedFiles: RejectedFile[];
}

@Component({
  selector: 'ngx-dropzone, [ngx-dropzone]',
  templateUrl: './ngx-dropzone.component.html',
  styleUrls: ['./ngx-dropzone.component.scss'],
  host: {
    '[class.ngx-dz-hovered]': 'isHovered()',
    '[class.unclickable]': 'disableClick()',
    '[class.expandable]': 'expandable()',
    '[class.ngx-dz-disabled]': 'disabled()',
  },
})
export class NgxDropzoneComponent implements OnChanges {
  private readonly _injector = inject(Injector);

  /** A list of the content-projected preview children. */
  readonly previewChildren = contentChildren(NgxDropzonePreviewComponent, {
    descendants: true,
  });

  protected readonly hasPreviews = computed(
    () => !!this.previewChildren().length
  );

  /** A template reference to the native file input element. */
  readonly fileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Emitted when any files were added or rejected. */
  readonly change = output<NgxDropzoneChangeEvent>();

  /** Set the accepted file types. Defaults to '*'. */
  readonly accept = input('*');

  /** Disable any user interaction with the component. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Allow the selection of multiple files. */
  readonly multiple = input(true, { transform: booleanAttribute });

  /** Set the maximum size a single file may have. */
  readonly maxFileSize = input(undefined, { transform: numberAttribute });

  /** Allow the dropzone container to expand vertically. */
  readonly expandable = input(false, { transform: booleanAttribute });

  /** Open the file selector on click. */
  readonly disableClick = input(false, { transform: booleanAttribute });

  /** Allow dropping directories. */
  readonly processDirectoryDrop = input(false, { transform: booleanAttribute });

  /** Expose the id, aria-label, aria-labelledby and aria-describedby of the native file input for proper accessibility. */
  readonly id = input('');
  readonly ariaLabel = input('', { alias: 'aria-label' });
  readonly ariaLabelledby = input('', { alias: 'aria-labelledby' });
  readonly ariaDescribedBy = input('', { alias: 'aria-describedby' });

  protected readonly isHovered = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.disabled && this.isHovered()) {
      this.isHovered.set(false);
    }
  }

  /** Show the native OS file explorer to select files. */
  @HostListener('click')
  _onClick() {
    if (!this.disableClick()) {
      this.showFileSelector();
    }
  }

  @HostListener('dragover', ['$event'])
  _onDragOver(event: DragEvent) {
    if (this.disabled()) {
      return;
    }

    preventDefault(event);
    this.isHovered.set(true);
  }

  @HostListener('dragleave')
  _onDragLeave() {
    this.isHovered.set(false);
  }

  @HostListener('drop', ['$event'])
  _onDrop(event: DragEvent) {
    if (this.disabled()) {
      return;
    }

    preventDefault(event);
    this.isHovered.set(false);

    // if processDirectoryDrop is not enabled or webkitGetAsEntry is not supported we handle the drop as usual
    if (
      !this.processDirectoryDrop() ||
      !DataTransferItem.prototype.webkitGetAsEntry
    ) {
      this.handleFileDrop(event.dataTransfer.files);

      // if processDirectoryDrop is enabled and webkitGetAsEntry is supported we can extract files from a dropped directory
    } else {
      const droppedItems: DataTransferItemList = event.dataTransfer.items;

      if (droppedItems.length > 0) {
        const droppedFiles: File[] = [];
        const droppedDirectories = [];

        // seperate dropped files from dropped directories for easier handling
        for (let i = 0; i < droppedItems.length; i++) {
          const entry = droppedItems[i].webkitGetAsEntry();
          if (entry.isFile) {
            droppedFiles.push(event.dataTransfer.files[i]);
          } else if (entry.isDirectory) {
            droppedDirectories.push(entry);
          }
        }

        // create a DataTransfer
        const droppedFilesList = new DataTransfer();
        droppedFiles.forEach((droppedFile) => {
          droppedFilesList.items.add(droppedFile);
        });

        // if no directory is dropped we are done and can call handleFileDrop
        if (!droppedDirectories.length && droppedFilesList.items.length) {
          this.handleFileDrop(droppedFilesList.files);
        }

        // if directories are dropped we extract the files from these directories one-by-one and add it to droppedFilesList
        if (droppedDirectories.length) {
          const extractFilesFromDirectoryCalls = [];

          for (const droppedDirectory of droppedDirectories) {
            extractFilesFromDirectoryCalls.push(
              this.extractFilesFromDirectory(droppedDirectory)
            );
          }

          // wait for all directories to be proccessed to add the extracted files afterwards
          Promise.all(extractFilesFromDirectoryCalls).then(
            (allExtractedFiles: any[]) => {
              allExtractedFiles
                .reduce((a, b) => [...a, ...b])
                .forEach((extractedFile: File) => {
                  droppedFilesList.items.add(extractedFile);
                });

              this.handleFileDrop(droppedFilesList.files);
            }
          );
        }
      }
    }
  }

  private extractFilesFromDirectory(directory) {
    async function getFileFromFileEntry(fileEntry) {
      try {
        return await new Promise((resolve, reject) =>
          fileEntry.file(resolve, reject)
        );
      } catch (err) {
        console.log('Error converting a fileEntry to a File: ', err);
      }
    }

    return new Promise((resolve, reject) => {
      const files: File[] = [];

      const dirReader = directory.createReader();

      // we need this to be a recursion because of this issue: https://bugs.chromium.org/p/chromium/issues/detail?id=514087
      const readEntries = () => {
        dirReader.readEntries(async (dirItems) => {
          if (!dirItems.length) {
            resolve(files);
          } else {
            const fileEntries = dirItems.filter((dirItem) => dirItem.isFile);

            for (const fileEntry of fileEntries) {
              const file: any = await getFileFromFileEntry(fileEntry);
              files.push(file);
            }

            readEntries();
          }
        });
      };
      readEntries();
    });
  }

  showFileSelector() {
    if (!this.disabled) {
      (this.fileInput().nativeElement as HTMLInputElement).click();
    }
  }

  _onFilesSelected(event) {
    const files: FileList = event.target.files;
    this.handleFileDrop(files);

    // Reset the native file input element to allow selecting the same file again
    this.fileInput().nativeElement.value = '';

    // fix(#32): Prevent the default event behaviour which caused the change event to emit twice.
    preventDefault(event);
  }

  private async handleFileDrop(files: FileList) {
    const { NgxDropzoneService } = await import('./ngx-dropzone.service');

    const service = this._injector.get(NgxDropzoneService);

    const result = service.parseFileList(
      files,
      this.accept(),
      this.maxFileSize(),
      this.multiple()
    );

    this.change.emit({
      addedFiles: result.addedFiles,
      rejectedFiles: result.rejectedFiles,
      source: this,
    });
  }
}
