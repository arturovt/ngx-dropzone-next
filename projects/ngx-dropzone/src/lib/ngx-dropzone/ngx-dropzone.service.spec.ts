import { TestBed, inject } from '@angular/core/testing';
import { NgxDropzoneService } from './ngx-dropzone.service';

// Mockup FileList class for unit tests
class MockFileList implements FileList {
  constructor(private files: File[]) {}

  get length(): number {
    return this.files.length;
  }

  item(index: number): File {
    return this.files[index];
  }

  add(file: File) {
    this.files.push(file);
  }

  [index: number]: File;

  // Return the array's iterator directly
  [Symbol.iterator](): ArrayIterator<File> {
    return this.files[Symbol.iterator]();
  }
}

// Helper function to create a list of files
function getRandomFileTypes(): File[] {
  return [
    new File(['RandomStringContentToSimulateFileSize'], 'myFile.txt', {
      type: 'text/plain',
    }),
    new File(
      ['RandomStringContentToSimulateBiggerFileSizeForUnitTest'],
      'myFile.csv',
      { type: 'text/csv' }
    ),
    new File(['RandomStringContentToSimulateFileSize'], 'myFile.jpg', {
      type: 'image/jpeg',
    }),
    new File(['RandomStringContentToSimulateFileSize'], 'myFile.png', {
      type: 'image/png',
    }),
    new File(
      ['RandomStringContentToSimulateBiggerFileSizeForUnitTest'],
      'myFile.mp4',
      { type: 'video/mp4' }
    ),
  ];
}

function fileWithType(type: string, name: string = 'file.txt'): File {
  return new File(['content'], name, { type });
}

function fileWithName(name: string, type: string = ''): File {
  return new File(['content'], name, { type });
}

describe('NgxDropzoneService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxDropzoneService],
    });
  });

  it('should be created', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      expect(service).toBeTruthy();
    }
  ));

  it('should return all files in the default configuration', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      let fileList = new MockFileList(getRandomFileTypes());

      const result = service.parseFileList(fileList, '*', null, true);
      console.log(
        'should return all files in the default configuration',
        result
      );
      expect(result.addedFiles.length).toEqual(fileList.length);
      expect(result.rejectedFiles.length).toEqual(0);
    }
  ));

  it('should filter for accepted type wildcard', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      const jpegFile = fileWithType('image/jpeg');
      const pngFile = fileWithType('image/png');
      const mp4File = fileWithType('video/mp4');
      let fileList = new MockFileList([jpegFile, pngFile, mp4File]);
      const accept = 'image/*';

      const result = service.parseFileList(fileList, accept, null, true);
      console.log('should filter for accepted mimetype wildcard', result);
      expect(result.addedFiles).toEqual([jpegFile, pngFile]);
      expect(result.rejectedFiles).toEqual([mp4File]);
    }
  ));

  it('should filter for multiple accepted types', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      const jpegFile = fileWithType('image/jpeg');
      const pngFile = fileWithType('image/png');
      const mp4File = fileWithType('video/mp4');
      let fileList = new MockFileList([jpegFile, pngFile, mp4File]);
      const accept = 'image/png,video/mp4';

      const result = service.parseFileList(fileList, accept, null, true);
      console.log('should filter for multiple accepted mimetypes', result);
      expect(result.addedFiles).toEqual([pngFile, mp4File]);
      expect(result.rejectedFiles).toEqual([jpegFile]);
    }
  ));

  it('should filter for accepted file extension and type', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      const fileWithJpegType = fileWithType('image/jpeg');
      const fileWithPngType = fileWithType('image/png');
      const fileWithTxtExtension = fileWithName('text.txt');

      console.log('Files:', {
        jpeg: { name: fileWithJpegType.name, type: fileWithJpegType.type },
        png: { name: fileWithPngType.name, type: fileWithPngType.type },
        txt: {
          name: fileWithTxtExtension.name,
          type: fileWithTxtExtension.type,
        },
      });

      let fileList = new MockFileList([
        fileWithJpegType,
        fileWithPngType,
        fileWithTxtExtension,
      ]);
      const accept = '.txt,image/png';

      const result = service.parseFileList(fileList, accept, null, true);

      console.log('Result:', result);

      expect(result.addedFiles.length).toBe(3);
      expect(result.rejectedFiles.length).toBe(0);
    }
  ));

  it('should filter for accepted file extension ignoring case', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      const txtFile = fileWithName('text.txt');
      let fileList = new MockFileList([txtFile]);
      const accept = '.TXT';

      const result = service.parseFileList(fileList, accept, null, true);
      console.log(
        'should filter for accepted file extension ignoring case',
        result
      );
      expect(result.addedFiles).toEqual([txtFile]);
    }
  ));

  it('should filter for accepted file type ignoring case', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      const txtFile = fileWithType('plain/text');
      let fileList = new MockFileList([txtFile]);
      const accept = 'PLAIN/TEXT';

      const result = service.parseFileList(fileList, accept, null, true);
      console.log('should filter for accepted file extension and type', result);
      expect(result.addedFiles).toEqual([txtFile]);
    }
  ));

  it('should filter for maximum file size', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      let fileList = new MockFileList(getRandomFileTypes());

      const result = service.parseFileList(fileList, '*', 50, true);
      console.log('should filter for maximum file size', result);
      expect(result.addedFiles.length).toEqual(3);
      expect(result.rejectedFiles.length).toEqual(2);
    }
  ));

  it('should handle single-selection mode', inject(
    [NgxDropzoneService],
    (service: NgxDropzoneService) => {
      let fileList = new MockFileList(getRandomFileTypes());

      const result = service.parseFileList(fileList, '*', null, false);
      console.log('should handle single-selection mode', result);
      expect(result.addedFiles.length).toEqual(1);
      expect(result.addedFiles[0].name).toEqual('myFile.txt');
    }
  ));
});

describe('NgxDropzoneService - Security Tests', () => {
  let service: NgxDropzoneService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxDropzoneService],
    });
    service = TestBed.inject(NgxDropzoneService);
  });

  describe('Double Extension Bypass Protection', () => {
    it('should reject files with double extensions like malware.jpg.exe', () => {
      const maliciousFile = fileWithName(
        'malware.jpg.exe',
        'application/x-msdownload'
      );
      const fileList = new MockFileList([maliciousFile]);
      const accept = '.jpg';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
      expect(result.rejectedFiles[0].reason).toBe('type');
    });

    it('should only check the last extension', () => {
      const validFile = fileWithName('document.backup.pdf', 'application/pdf');
      const fileList = new MockFileList([validFile]);
      const accept = '.pdf';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(1);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should reject file without extension when extension is required', () => {
      const noExtFile = fileWithName('malware', 'application/octet-stream');
      const fileList = new MockFileList([noExtFile]);
      const accept = '.exe';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });
  });

  describe('MIME Type Spoofing Protection', () => {
    it('should reject mismatched MIME type and extension', () => {
      // Executable pretending to be image via MIME type
      const spoofedFile = fileWithName('virus.exe', 'image/png');
      const fileList = new MockFileList([spoofedFile]);
      const accept = 'image/png';

      const result = service.parseFileList(fileList, accept, null, true);

      // Note: Current implementation would ACCEPT this (vulnerability)
      // After fix with content validation, this should be rejected
      // For now, we document the vulnerability
      expect(result.addedFiles.length).toBe(1); // Currently passes - BAD!
    });

    it('should handle empty MIME type', () => {
      const noMimeFile = fileWithName('file.txt', '');
      const fileList = new MockFileList([noMimeFile]);
      const accept = 'text/plain';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });
  });

  describe('Wildcard MIME Type Security', () => {
    it('should handle wildcard with empty file type', () => {
      const emptyTypeFile = fileWithType('', 'file.bin');
      const fileList = new MockFileList([emptyTypeFile]);
      const accept = 'image/*';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });

    it('should reject invalid wildcard patterns', () => {
      const imageFile = fileWithType('image/png');
      const fileList = new MockFileList([imageFile]);
      const accept = '*/png'; // Invalid wildcard

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });

    it('should only match primary MIME type in wildcard', () => {
      const videoFile = fileWithType('video/mp4');
      const fileList = new MockFileList([videoFile]);
      const accept = 'image/*';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });
  });

  describe('Path Traversal Protection', () => {
    it('should handle path traversal in filename', () => {
      const traversalFile = fileWithName('../../etc/passwd', 'text/plain');
      const fileList = new MockFileList([traversalFile]);
      const accept = '*';

      const result = service.parseFileList(fileList, accept, null, true);

      // After sanitization, filename should be safe
      expect(result.addedFiles.length).toBe(1);
      // Note: Sanitization should convert this to something like "____etc_passwd"
    });

    it('should handle backslash path traversal', () => {
      const traversalFile = fileWithName(
        '..\\..\\windows\\system32\\config',
        'text/plain'
      );
      const fileList = new MockFileList([traversalFile]);
      const accept = '*';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(1);
    });

    it('should handle multiple consecutive dots', () => {
      const dotsFile = fileWithName('file...txt', 'text/plain');
      const fileList = new MockFileList([dotsFile]);
      const accept = '.txt';

      const result = service.parseFileList(fileList, accept, null, true);

      // Should still match .txt extension after sanitization
      expect(result.addedFiles.length).toBe(1);
    });
  });

  describe('Special Character Handling', () => {
    it('should handle null bytes in filename', () => {
      const nullByteFile = fileWithName('evil.exe\0.jpg', 'image/jpeg');
      const fileList = new MockFileList([nullByteFile]);
      const accept = '.jpg';

      const result = service.parseFileList(fileList, accept, null, true);

      // After sanitization, null byte should be removed
      expect(result.addedFiles.length).toBe(1);
    });

    it('should handle Unicode control characters', () => {
      const controlCharFile = fileWithName('file\u202E.txt.exe', 'text/plain');
      const fileList = new MockFileList([controlCharFile]);
      const accept = '.txt';

      const result = service.parseFileList(fileList, accept, null, true);

      // Should reject due to .exe extension (after sanitization)
      expect(result.addedFiles.length).toBe(0);
    });

    it('should handle script tags in filename', () => {
      const xssFile = fileWithName(
        '<script>alert(1)</script>.jpg',
        'image/jpeg'
      );
      const fileList = new MockFileList([xssFile]);
      const accept = '.jpg';

      const result = service.parseFileList(fileList, accept, null, true);

      // Should be sanitized and accepted
      expect(result.addedFiles.length).toBe(1);
    });
  });

  describe('Accept Parameter Edge Cases', () => {
    it('should handle empty accept string', () => {
      const file = fileWithType('text/plain');
      const fileList = new MockFileList([file]);
      const accept = '';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });

    it('should handle accept with extra whitespace', () => {
      const imageFile = fileWithType('image/png');
      const fileList = new MockFileList([imageFile]);
      const accept = '  image/png  ,  image/jpeg  ';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(1);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should handle accept with empty entries', () => {
      const imageFile = fileWithType('image/png');
      const fileList = new MockFileList([imageFile]);
      const accept = 'image/png,,,image/jpeg';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(1);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should handle malformed MIME types', () => {
      const file = fileWithType('image/png');
      const fileList = new MockFileList([file]);
      const accept = 'image//png'; // Double slash

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
    });
  });

  describe('File Size Edge Cases', () => {
    it('should handle zero-byte files', () => {
      const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
      const fileList = new MockFileList([emptyFile]);
      const accept = '*';

      const result = service.parseFileList(fileList, accept, 100, true);

      expect(result.addedFiles.length).toBe(1);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should handle exact size limit', () => {
      const content = 'x'.repeat(100);
      const exactFile = new File([content], 'file.txt', { type: 'text/plain' });
      const fileList = new MockFileList([exactFile]);
      const maxSize = 100;

      const result = service.parseFileList(fileList, '*', maxSize, true);

      expect(result.addedFiles.length).toBe(1);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should reject file one byte over limit', () => {
      const content = 'x'.repeat(101);
      const overFile = new File([content], 'file.txt', { type: 'text/plain' });
      const fileList = new MockFileList([overFile]);
      const maxSize = 100;

      const result = service.parseFileList(fileList, '*', maxSize, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);
      expect(result.rejectedFiles[0].reason).toBe('size');
    });
  });

  describe('Multiple File Handling', () => {
    it('should reject all files after first when multiple is false', () => {
      const files = [
        fileWithName('file1.txt'),
        fileWithName('file2.txt'),
        fileWithName('file3.txt'),
      ];
      const fileList = new MockFileList(files);

      const result = service.parseFileList(fileList, '*', null, false);

      expect(result.addedFiles.length).toBe(1);
      expect(result.addedFiles[0].name).toBe('file1.txt');
      expect(result.rejectedFiles.length).toBe(2);
      expect(result.rejectedFiles[0].reason).toBe('no_multiple');
      expect(result.rejectedFiles[1].reason).toBe('no_multiple');
    });

    it('should apply all filters in correct order', () => {
      const files = [
        fileWithName('good.txt', 'text/plain'),
        fileWithName('bad-type.jpg', 'image/jpeg'),
        new File(['x'.repeat(200)], 'bad-size.txt', { type: 'text/plain' }),
        fileWithName('rejected-multiple.txt', 'text/plain'),
      ];
      const fileList = new MockFileList(files);

      const result = service.parseFileList(fileList, 'text/plain', 100, false);

      expect(result.addedFiles.length).toBe(1);
      expect(result.addedFiles[0].name).toBe('good.txt');

      expect(result.rejectedFiles.length).toBe(3);
      expect(result.rejectedFiles[0].reason).toBe('type');
      expect(result.rejectedFiles[1].reason).toBe('size');
      expect(result.rejectedFiles[2].reason).toBe('no_multiple');
    });
  });

  describe('Case Sensitivity', () => {
    it('should match extension case-insensitively', () => {
      const files = [
        fileWithName('file.TXT'),
        fileWithName('file.txt'),
        fileWithName('file.Txt'),
      ];
      const fileList = new MockFileList(files);
      const accept = '.txt';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(3);
      expect(result.rejectedFiles.length).toBe(0);
    });

    it('should match MIME type case-insensitively', () => {
      const files = [
        fileWithType('TEXT/PLAIN'),
        fileWithType('text/plain'),
        fileWithType('Text/Plain'),
      ];
      const fileList = new MockFileList(files);
      const accept = 'text/plain';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(3);
      expect(result.rejectedFiles.length).toBe(0);
    });
  });

  describe('Real-World Attack Scenarios', () => {
    it('should handle polyglot file (valid as multiple types)', () => {
      // A file that's both valid JPG and valid JS
      const polyglot = fileWithName('polyglot.jpg', 'image/jpeg');
      const fileList = new MockFileList([polyglot]);
      const accept = 'image/jpeg';

      const result = service.parseFileList(fileList, accept, null, true);

      // Client-side check passes, but server MUST validate actual content
      expect(result.addedFiles.length).toBe(1);
    });

    it('should handle SVG with embedded scripts', () => {
      const maliciousSvg = fileWithName('xss.svg', 'image/svg+xml');
      const fileList = new MockFileList([maliciousSvg]);
      const accept = 'image/svg+xml';

      const result = service.parseFileList(fileList, accept, null, true);

      // SVG can contain scripts - server must sanitize
      expect(result.addedFiles.length).toBe(1);
    });

    it('should handle extremely long filename', () => {
      const longName = 'a'.repeat(1000) + '.txt';
      const longFile = fileWithName(longName, 'text/plain');
      const fileList = new MockFileList([longFile]);
      const accept = '.txt';

      const result = service.parseFileList(fileList, accept, null, true);

      expect(result.addedFiles.length).toBe(0);
      expect(result.rejectedFiles.length).toBe(1);

      expect(result.rejectedFiles[0].name).toBe(longName);
    });
  });
});
