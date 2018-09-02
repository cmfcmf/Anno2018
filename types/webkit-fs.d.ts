type WebKitEntriesCallback =
  | ((entries: WebKitEntry[]) => void)
  | { handleEvent(entries: WebKitEntry[]): void };

type WebKitErrorCallback =
  | ((err: DOMError) => void)
  | { handleEvent(err: DOMError): void };

type WebKitFileCallback =
  | ((file: File) => void)
  | { handleEvent(file: File): void };

interface WebKitDirectoryEntry extends WebKitEntry {
  createReader(): WebKitDirectoryReader;
}

declare var WebKitDirectoryEntry: {
  prototype: WebKitDirectoryEntry;
  new (): WebKitDirectoryEntry;
};

interface WebKitDirectoryReader {
  readEntries(
    successCallback: WebKitEntriesCallback,
    errorCallback?: WebKitErrorCallback
  ): void;
}

declare var WebKitDirectoryReader: {
  prototype: WebKitDirectoryReader;
  new (): WebKitDirectoryReader;
};

interface WebKitEntry {
  readonly filesystem: WebKitFileSystem;
  readonly fullPath: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
  readonly name: string;
}

declare var WebKitEntry: {
  prototype: WebKitEntry;
  new (): WebKitEntry;
};

interface WebKitFileEntry extends WebKitEntry {
  file(
    successCallback: WebKitFileCallback,
    errorCallback?: WebKitErrorCallback
  ): void;
}

declare var WebKitFileEntry: {
  prototype: WebKitFileEntry;
  new (): WebKitFileEntry;
};

interface WebKitFileSystem {
  readonly name: string;
  readonly root: WebKitDirectoryEntry;
}

declare var WebKitFileSystem: {
  prototype: WebKitFileSystem;
  new (): WebKitFileSystem;
};
