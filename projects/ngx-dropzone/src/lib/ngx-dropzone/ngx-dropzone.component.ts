import {
  Component,
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
  type OnChanges,
  type SimpleChanges,
  PendingTasks,
  afterNextRender,
  DestroyRef,
} from '@angular/core';

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
  readonly injector = inject(Injector);

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

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _pendingTasks = inject(PendingTasks);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (typeof ngServerMode === 'undefined' || ngServerMode) {
      return;
    }

    afterNextRender(() => this._setupEventListeners());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.isHovered()) {
      this.isHovered.set(false);
    }
  }

  showFileSelector() {
    if (!this.disabled()) {
      (this.fileInput().nativeElement as HTMLInputElement).click();
    }
  }

  private _setupEventListeners(): void {
    const host = this._host.nativeElement;
    const fileInput = this.fileInput().nativeElement;

    const onClick = () => {
      if (!this.disableClick()) {
        this.showFileSelector();
      }
    };

    // Dragover - prevents default to allow drop & shows hover state.
    const onDragover = (event: DragEvent) => {
      if (this.disabled()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      this.isHovered.set(true);
    };

    // Dragleave - removes hover state when drag leaves element.
    const onDragleave = (event: DragEvent) => {
      const target = event.currentTarget as HTMLElement | null;
      const related = event.relatedTarget as Node | null;

      if (target && (!related || !target.contains(related))) {
        this.isHovered.set(false);
      }
    };

    const onDrop = (event: DragEvent) => {
      if (this.disabled()) {
        return;
      }

      // fix(#32): Prevent the default event behaviour which caused the change event to emit twice.
      event.preventDefault();
      event.stopPropagation();

      this.isHovered.set(false);
      const { dataTransfer } = event;

      if (dataTransfer === null) {
        return;
      }

      this._pendingTasks.run(async () => {
        const { onDrop } = await import('./on-drop');
        onDrop(this, dataTransfer);
      });
    };

    // Manual event listeners to avoid Angular's change detection overhead.
    host.addEventListener('click', onClick); // Show the native OS file explorer to select files.
    host.addEventListener('dragover', onDragover);
    host.addEventListener('dragleave', onDragleave);
    host.addEventListener('drop', onDrop);
    fileInput.addEventListener('change', this._onFilesSelected);

    this._destroyRef.onDestroy(() => {
      host.removeEventListener('click', onClick);
      host.removeEventListener('dragover', onDragover);
      host.removeEventListener('dragleave', onDragleave);
      host.removeEventListener('drop', onDrop);
      fileInput.removeEventListener('change', this._onFilesSelected);
    });
  }

  // Handles files selected via <input type="file">.
  private _onFilesSelected = async (event: Event) => {
    const target = <HTMLInputElement>event.target;
    const files = target.files;

    // fix(#32): Prevent the default event behaviour which caused the change event to emit twice.
    event.preventDefault();
    event.stopPropagation();

    if (files === null || files.length === 0) {
      return;
    }

    this._pendingTasks.run(async () => {
      // We must `await` before setting `value` to an empty string,
      // because it's going to prune the `files` on the input element.
      await import('./on-drop').then((m) => m.handleFileDrop(this, files));

      // Reset the native file input element to allow selecting the same file again
      target.value = '';
    });
  };
}
