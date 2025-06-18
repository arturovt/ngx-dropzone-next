import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  NgxDropzoneChangeEvent,
  NgxDropzoneComponent,
  NgxDropzoneImagePreviewComponent,
  NgxDropzoneLabelDirective,
  NgxDropzonePreviewComponent,
  NgxDropzoneVideoPreviewComponent,
} from 'ngx-dropzone-next';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgxDropzoneComponent,
    NgxDropzonePreviewComponent,
    NgxDropzoneVideoPreviewComponent,
    NgxDropzoneImagePreviewComponent,
    NgxDropzoneLabelDirective,
  ],
})
export class AppComponent {
  readonly files = signal<File[]>([]);

  onFilesAdded(event: Event | NgxDropzoneChangeEvent) {
    if (event instanceof Event) {
      return;
    }

    this.files.update((files) => [...files, ...event.addedFiles]);
  }

  onRemove(file: File) {
    console.log(file);
    this.files.update((files) => {
      files.splice(files.indexOf(file), 1);
      return [...files];
    });
  }
}
