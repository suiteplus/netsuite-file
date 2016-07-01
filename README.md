# netsuite-file

File cabinet helpers for netsuite (suitescript 1.0).

### Usage

(currently) Use browserify and `require('netsuite-file')`

### Functions

**pathInfo(pathIn : string , baseIn = '/', createFolders = false) : IPathInfo**

Brings in path info relative to a base path. Creates folders if asked to and necessary.

Base path, if used, must start with '/'

Returns:

```typescript
export interface IPathInfo {
    folderid: number;
    filename: string;
    fileext: string;
    nsfileext: string;
    pathabsolute: string;
    pathrelative: string;
    baserelative: string;
}
```

**saveFile(path : string, contents : string) : number**

Shorthand for saving a file. The path must begin with '/'.

