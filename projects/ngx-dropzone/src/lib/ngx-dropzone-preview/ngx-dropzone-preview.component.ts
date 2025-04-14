import {
  Component,
  HostBinding,
  HostListener,
  output,
  ChangeDetectionStrategy,
  booleanAttribute,
  input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { NgxDropzoneRemoveBadgeComponent } from './ngx-dropzone-remove-badge/ngx-dropzone-remove-badge.component';

@Component({
  selector: 'ngx-dropzone-preview',
  templateUrl: './ngx-dropzone-preview.component.html',
  styleUrls: ['./ngx-dropzone-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDropzoneRemoveBadgeComponent],
  host: {
    /** We use the HostBinding to pass these common styles to child components. */
    '[style]': 'hostStyles',
  },
})
export class NgxDropzonePreviewComponent {
  readonly hostStyles = this.sanitizer.bypassSecurityTrustStyle(`
    display: flex;
    height: 140px;
    min-height: 140px;
    min-width: 180px;
    max-width: 180px;
    justify-content: center;
    align-items: center;
    padding: 0 20px;
    margin: 10px;
    border-radius: 5px;
    position: relative;
  `);

  constructor(protected sanitizer: DomSanitizer) {}

  /** The file to preview. */
  readonly file = input<File>();

  /** Allow the user to remove files. */
  readonly removable = input(false, { transform: booleanAttribute });

  /** Emitted when the element should be removed. */
  readonly removed = output<File>();

  @HostListener('keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (
      // Backspace
      event.keyCode === 8 ||
      // Delete
      event.keyCode === 46
    ) {
      this.remove();
    }
  }

  /** Make the preview item focusable using the tab key. */
  @HostBinding('tabindex') tabIndex = 0;

  /** Remove method to be used from the template. */
  _remove(event: MouseEvent) {
    event.stopPropagation();
    this.remove();
  }

  /** Remove the preview item (use from component code). */
  remove() {
    if (this.removable()) {
      this.removed.emit(this.file());
    }
  }

  protected async readFile(): Promise<string | ArrayBuffer> {
    return new Promise<string | ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();

      const cleanup = () => {
        reader.removeEventListener('load', onLoad);
        reader.removeEventListener('error', onError);
      };

      const onLoad = () => {
        cleanup();
        resolve(reader.result);
      };

      const onError = (error: ErrorEvent) => {
        cleanup();
        reject(error);
      };

      reader.addEventListener('load', onLoad);
      reader.addEventListener('error', onError);

      if (!this.file()) {
        return reject(
          'No file to read. Please provide a file using the [file] Input property.'
        );
      }

      reader.readAsDataURL(this.file());
    });
  }
}
