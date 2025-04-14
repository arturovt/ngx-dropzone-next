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
  type OnChanges,
  type SimpleChanges,
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

    import('./on-drop').then((m) => m.onDrop(this, event));
  }

  showFileSelector() {
    if (!this.disabled) {
      (this.fileInput().nativeElement as HTMLInputElement).click();
    }
  }

  _onFilesSelected(event: Event) {
    const files: FileList = (event.target as HTMLInputElement).files;

    import('./on-drop').then((m) => m.handleFileDrop(this, files));

    // Reset the native file input element to allow selecting the same file again
    this.fileInput().nativeElement.value = '';

    // fix(#32): Prevent the default event behaviour which caused the change event to emit twice.
    preventDefault(event);
  }
}
