import type { NgxDropzoneComponent } from './ngx-dropzone.component';

export async function onDrop(
  ctx: NgxDropzoneComponent,
  { dataTransfer }: DragEvent
) {
  if (!dataTransfer) {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      throw new Error('dataTransfer is not defined on the event object.');
    }

    return;
  }

  // if processDirectoryDrop is not enabled or webkitGetAsEntry is not supported we handle the drop as usual
  if (
    !ctx.processDirectoryDrop() ||
    !DataTransferItem.prototype.webkitGetAsEntry
  ) {
    await handleFileDrop(ctx, dataTransfer.files);
    // if processDirectoryDrop is enabled and webkitGetAsEntry is supported we can extract files from a dropped directory
  } else if (dataTransfer.items.length > 0) {
    const droppedItems: DataTransferItemList = dataTransfer!.items;

    const droppedFiles: File[] = [];
    const droppedDirectories: FileSystemEntry[] = [];

    // seperate dropped files from dropped directories for easier handling
    for (let index = 0; index < droppedItems.length; index++) {
      const entry = droppedItems[index].webkitGetAsEntry();

      if (!entry) {
        continue;
      }

      if (entry.isFile) {
        droppedFiles.push(dataTransfer.files[index]);
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
      const extractFilesFromDirectoryCalls: Promise<File[]>[] = [];

      for (const droppedDirectory of droppedDirectories) {
        extractFilesFromDirectoryCalls.push(
          extractFilesFromDirectory(droppedDirectory)
        );
      }

      // wait for all directories to be proccessed to add the extracted files afterwards
      await Promise.all(extractFilesFromDirectoryCalls).then(
        (allExtractedFiles: File[][]) => {
          allExtractedFiles
            .reduce((a, b) => [...a, ...b])
            .forEach((extractedFile: File) => {
              droppedFilesList.items.add(extractedFile);
            });
        }
      );

      await handleFileDrop(ctx, droppedFilesList.files);
    }
  }
}

async function getFileFromFileEntry(entry: FileSystemEntry) {
  try {
    const fileSystemFileEntry = <FileSystemFileEntry>entry;

    return await new Promise<File>((resolve, reject) =>
      fileSystemFileEntry.file(resolve, reject)
    );
  } catch (error) {
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      console.log('Error converting a fileEntry to a File: ', error);
    }
    return null;
  }
}

function extractFilesFromDirectory(directory: FileSystemEntry) {
  return new Promise<File[]>((resolve) => {
    const files: File[] = [];

    const reader = (directory as FileSystemDirectoryEntry).createReader();

    // we need this to be a recursion because of this issue: https://bugs.chromium.org/p/chromium/issues/detail?id=514087
    const readEntries = () => {
      reader.readEntries(async (entries: FileSystemEntry[]) => {
        if (entries.length > 0) {
          for (const entry of entries.filter(({ isFile }) => isFile)) {
            const file = await getFileFromFileEntry(entry);
            file && files.push(file);
          }

          readEntries();
        } else {
          resolve(files);
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
    ctx.accept(),
    ctx.maxFileSize(),
    ctx.multiple()
  );

  ctx.change.emit({
    addedFiles: result.addedFiles,
    rejectedFiles: result.rejectedFiles,
    source: ctx,
  });
}
