import {
  Component,
  inject,
  DestroyRef,
  afterNextRender,
  signal,
  ChangeDetectionStrategy,
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

  private videoSrc: string;

  constructor(sanitizer: DomSanitizer) {
    super(sanitizer);

    inject(DestroyRef).onDestroy(() => URL.revokeObjectURL(this.videoSrc));

    afterNextRender(() => {
      if (!this.file()) {
        return;
      }

      /**
       * We sanitize the URL here to enable the preview.
       * Please note that this could cause security issues!
       **/
      this.videoSrc = URL.createObjectURL(this.file());
      this._sanitizedVideoSrc.set(
        this.sanitizer.bypassSecurityTrustUrl(this.videoSrc)
      );
    });
  }
}
