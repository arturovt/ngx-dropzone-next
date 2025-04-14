import {
  Component,
  Input,
  HostBinding,
  HostListener,
  output,
  ChangeDetectionStrategy,
  booleanAttribute,
} from '@angular/core';
import { SafeStyle, DomSanitizer } from '@angular/platform-browser';

import { NgxDropzoneRemoveBadgeComponent } from './ngx-dropzone-remove-badge/ngx-dropzone-remove-badge.component';

const enum KeyCode {
  Backspace = 8,
  Delete = 46,
}

@Component({
  selector: 'ngx-dropzone-preview',
  templateUrl: './ngx-dropzone-preview.component.html',
  styleUrls: ['./ngx-dropzone-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDropzoneRemoveBadgeComponent],
})
export class NgxDropzonePreviewComponent {
  constructor(protected sanitizer: DomSanitizer) {}

  protected _file: File;

  /** The file to preview. */
  @Input()
  set file(value: File) {
    this._file = value;
  }
  get file(): File {
    return this._file;
  }

  /** Allow the user to remove files. */
  @Input()
  get removable(): boolean {
    return this._removable;
  }
  set removable(value: boolean) {
    this._removable = booleanAttribute(value);
  }
  protected _removable = false;

  /** Emitted when the element should be removed. */
  readonly removed = output<File>();

  @HostListener('keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (
      event.keyCode === KeyCode.Backspace ||
      event.keyCode === KeyCode.Delete
    ) {
      this.remove();
    }
  }

  /** We use the HostBinding to pass these common styles to child components. */
  @HostBinding('style')
  get hostStyle(): SafeStyle {
    const styles = `
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
		`;

    return this.sanitizer.bypassSecurityTrustStyle(styles);
  }

  /** Make the preview item focusable using the tab key. */
  @HostBinding('tabindex') tabIndex = 0;

  /** Remove method to be used from the template. */
  _remove(event) {
    event.stopPropagation();
    this.remove();
  }

  /** Remove the preview item (use from component code). */
  remove() {
    if (this._removable) {
      this.removed.emit(this.file);
    }
  }

  protected async readFile(): Promise<string | ArrayBuffer> {
    return new Promise<string | ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve((e.target as FileReader).result);
      };

      reader.onerror = (e) => {
        console.error(`FileReader failed on file ${this.file.name}.`);
        reject(e);
      };

      if (!this.file) {
        return reject(
          'No file to read. Please provide a file using the [file] Input property.'
        );
      }

      reader.readAsDataURL(this.file);
    });
  }
}
