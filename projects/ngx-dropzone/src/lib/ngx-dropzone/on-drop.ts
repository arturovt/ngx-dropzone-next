import type { NgxDropzoneComponent } from './ngx-dropzone.component';

export async function onDrop(ctx: NgxDropzoneComponent, event: DragEvent) {
  // if processDirectoryDrop is not enabled or webkitGetAsEntry is not supported we handle the drop as usual
  if (
    !ctx.processDirectoryDrop() ||
    !DataTransferItem.prototype.webkitGetAsEntry
  ) {
    handleFileDrop(ctx, event.dataTransfer.files);

    // if processDirectoryDrop is enabled and webkitGetAsEntry is supported we can extract files from a dropped directory
  } else {
    const droppedItems: DataTransferItemList = event.dataTransfer.items;

    if (droppedItems.length > 0) {
      const droppedFiles: File[] = [];
      const droppedDirectories: FileSystemEntry[] = [];

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
        handleFileDrop(ctx, droppedFilesList.files);
      }

      // if directories are dropped we extract the files from these directories one-by-one and add it to droppedFilesList
      if (droppedDirectories.length) {
        const extractFilesFromDirectoryCalls = [];

        for (const droppedDirectory of droppedDirectories) {
          extractFilesFromDirectoryCalls.push(
            extractFilesFromDirectory(droppedDirectory)
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

            handleFileDrop(ctx, droppedFilesList.files);
          }
        );
      }
    }
  }
}

function extractFilesFromDirectory(directory: FileSystemEntry) {
  async function getFileFromFileEntry(fileEntry) {
    try {
      return await new Promise((resolve, reject) =>
        fileEntry.file(resolve, reject)
      );
    } catch (err) {
      console.log('Error converting a fileEntry to a File: ', err);
    }
  }

  return new Promise((resolve) => {
    const files: File[] = [];

    const dirReader = (directory as FileSystemDirectoryEntry).createReader();

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

export async function handleFileDrop(
  ctx: NgxDropzoneComponent,
  files: FileList
) {
  const { NgxDropzoneService } = await import('./ngx-dropzone.service');

  const service = ctx.injector.get(NgxDropzoneService);

  const result = service.parseFileList(
    files,
    this.accept(),
    this.maxFileSize(),
    this.multiple()
  );

  ctx.change.emit({
    addedFiles: result.addedFiles,
    rejectedFiles: result.rejectedFiles,
    source: ctx,
  });
}
