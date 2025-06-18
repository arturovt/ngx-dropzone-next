import {
  Component,
  inject,
  DestroyRef,
  afterNextRender,
  signal,
  ChangeDetectionStrategy,
  untracked,
} from '@angular/core';
import { DomSanitizer, type SafeUrl } from '@angular/platform-browser';

import { NgxDropzonePreviewComponent } from '../ngx-dropzone-preview.component';
import { NgxDropzoneRemoveBadgeComponent } from '../ngx-dropzone-remove-badge/ngx-dropzone-remove-badge.component';

@Component({
  selector: 'ngx-dropzone-video-preview',
  templateUrl: './ngx-dropzone-video-preview.component.html',
  styleUrls: ['./ngx-dropzone-video-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxDropzoneRemoveBadgeComponent],
  providers: [
    {
      provide: NgxDropzonePreviewComponent,
      useExisting: NgxDropzoneVideoPreviewComponent,
    },
  ],
})
export class NgxDropzoneVideoPreviewComponent extends NgxDropzonePreviewComponent {
  /** The video data source. */
  protected readonly _sanitizedVideoSrc = signal<SafeUrl | null>(null);

  constructor() {
    super();

    const destroyRef = inject(DestroyRef);
    const sanitizer = inject(DomSanitizer);

    afterNextRender(() => {
      const file = untracked(this.file);
      if (!file) return;

      /**
       * We sanitize the URL here to enable the preview.
       * Please note that this could cause security issues!
       **/
      const videoObjectUrl = URL.createObjectURL(file);
      this._sanitizedVideoSrc.set(
        sanitizer.bypassSecurityTrustUrl(videoObjectUrl)
      );

      destroyRef.onDestroy(() => URL.revokeObjectURL(videoObjectUrl));
    });
  }
}
