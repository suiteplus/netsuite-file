///<reference path="../typings/suitescript-1.d.ts"/>

var NON_BINARY_FILETYPES = [
    'CSV',
    'HTMLDOC',
    'JAVASCRIPT',
    'MESSAGERFC',
    'PLAINTEXT',
    'POSTSCRIPT',
    'RTF',
    'SMS',
    'STYLESHEET',
    'XMLDOC'
];

var EXT_TYPES = {
    dwg: 'AUTOCAD',
    bmp: 'BMPIMAGE',
    csv: 'CSV',
    xls: 'EXCEL',
    swf: 'FLASH',
    gif: 'GIFIMAGE',
    gz: 'GZIP',
    htm: 'HTMLDOC',
    html: 'HTMLDOC' ,
    ico: 'ICON',
    js: 'JAVASCRIPT',
    jpg: 'JPGIMAGE',
    eml: 'MESSAGERFC',
    mp3: 'MP3',
    mpg: 'MPEGMOVIE',
    mpp: 'MSPROJECT',
    pdf: 'PDF',
    pjpeg: 'PJPGIMAGE',
    txt: 'PLAINTEXT',
    png: 'PNGIMAGE',
    ps: 'POSTSCRIPT',
    ppt: 'POWERPOINT',
    mov: 'QUICKTIME',
    rtf: 'RTF',
    sms: 'SMS',
    css: 'STYLESHEET',
    tiff: 'TIFFIMAGE',
    vsd: 'VISIO',
    doc: 'WORD',
    xml: 'XMLDOC',
    zip: 'ZIP'
};



interface Folder {
    id : number;
    name : string;
    parent : number|string;
    abspath? : string;
}

//all folders with absolute path
function allFolders() : Folder[] {
    let _allFolders = bigSearch('folder', null, searchCols(['name','parent']));
    const allFolders : Folder[] = <any>_allFolders.map(searchResToCollection);
    const foldersIdxParent = allFolders.reduce((bef,curr:Folder) => {
        curr.parent = curr.parent || '_ROOT';
        bef[curr.parent] = bef[curr.parent] || [];
        bef[curr.parent].push(curr)
        return bef;
    },{})

    foldersIdxParent['_ROOT'].forEach( (item:Folder) => {
        function swipe( f:Folder ) {
            if ( foldersIdxParent[f.id] ) {
                foldersIdxParent[f.id].forEach( (inner:Folder) => {
                    inner.abspath = f.abspath + '/' + inner.name;
                    swipe(inner);
                })
            }
        }
        item.abspath = `/${item.name}`;
        swipe(item);
    })

    return allFolders;
}

export interface IPathInfo {
    folderid?: number;
    filename: string | void;
    fileext: string | void;
    nsfileext: string | void;
    pathabsolute?: string | void;
    pathrelative?: string | void;
    baseabsolute: string;
    baserelative: string;
    tails? : IPathInfoTail[];
}

export interface IPathInfoTail {
    folderid : number;
    pathabsolute : string;
    pathrelative : string;
    baserelative : string;
    baseabsolute : string;
}

function _relativePath( src , relativeTo ) {

    var o;

    //no backwards walking
    if ( src.substr(0,relativeTo.length) == relativeTo ) {

        o = src.substr(relativeTo.length)

    //backwards walking
    } else {
        // a / b / c1 / d1
        // a / b / d
        let s_src = src.split('/').filter( i => i == true)
        let s_rel = relativeTo.split('/').filter( i => i == true );
        let count = 0, walk = '';
        for ( let x = 0 ; x < s_src.length ; x++ ) {
            if (s_rel[x] == s_src[x]) count++
            else {
                walk += '/' + s_src[x];
            }
        }
        for ( let x = 0 ; x < count ; x++ ) {
            walk = '../' + walk;
        }
        o = walk;
    }

    return o || '.';
}


export function pathInfo(pathIn : string , baseIn = '/', createFolders = false) : IPathInfo {

    if (pathIn.charAt(0) == '/') {
        pathIn = pathIn.substr(1);
        baseIn = '/';
    }
    if (baseIn.substr(-1) != '/') baseIn += '/';

    const absPath = (baseIn + pathIn)
        .replace(/[\\]/g, '/'); //windows fix
    let _split = absPath.split('/');
    const filename = _split[_split.length-1];
    _split.length = _split.length - 1;
    const absBase = _split.join('/');
    const absBaseSplit = _split.slice(1);

    const hasWildcard = absBaseSplit.some( i => i == '**' );
    let _ext = filename ? filename.split('.')[1] : null;
    let prevFolder = null;
    if (!hasWildcard) {
        absBaseSplit.forEach( folderName => {
            let filters = [
                [ 'name', 'is', folderName ] ,
                'and' ,
                ['parent', 'anyof', (prevFolder || '@NONE@') ]
            ];
            var res_folder = nlapiSearchRecord('folder', null , filters);

            if (!res_folder && !createFolders) {
                throw nlapiCreateError('FOLDER_NOT_FOUND', `Folder ${folderName} not found!`, true);
            } else if (!res_folder && createFolders) {
                var newFolderRec = nlapiCreateRecord('folder');
                newFolderRec.setFieldValue('name', folderName);
                newFolderRec.setFieldValue('parent', prevFolder);
                prevFolder = nlapiSubmitRecord(newFolderRec);
            } else {
                prevFolder = res_folder[0].getId();
            }
        })

        return {
            folderid : prevFolder ,
            filename : filename ? filename : null ,
            fileext : _ext ,
            nsfileext : _ext ? EXT_TYPES[_ext] : null ,
            pathabsolute : filename ? absPath : null ,
            pathrelative : filename ? _relativePath(absPath,baseIn) : null ,
            baseabsolute : absBase ,
            baserelative : _relativePath(absBase, baseIn)
        };

    } else {
        let preWildcard = '', postWildcard = '', isAfter = false;
        absBaseSplit.forEach( item => {
            if (item == '**') isAfter = true;
            else if (isAfter) postWildcard += '/' + item;
            else {
                preWildcard += '/' + item;
            }
        });

        let found = allFolders().filter( folder => {
            let pre = !preWildcard.length || ( folder.abspath.substr(0,preWildcard.length) == preWildcard );
            let post = !postWildcard.length || ( folder.abspath.substr(-postWildcard.length) == postWildcard );
            return pre && post;
        }).map( folder => {
            let pabs = filename ? folder.abspath + '/' + filename : null;
            return {
                folderid: folder.id,
                pathabsolute: pabs ,
                pathrelative: filename ? _relativePath(pabs, baseIn) : null ,
                baseabsolute: folder.abspath ,
                baserelative: _relativePath(folder.abspath, baseIn)
            }
        });

        return {
            filename : filename ? filename : null ,
            fileext : _ext ,
            nsfileext : _ext ? EXT_TYPES[_ext] : null ,
            baseabsolute : preWildcard ,
            baserelative : _relativePath(preWildcard, baseIn) ,
            tails : found
        }

    }
}

export var save = saveFile;
export function saveFile(path : string, contents : string) : number {
    var info = pathInfo(path,undefined,true);
    var file = nlapiCreateFile(<string>info.filename,(<string>info.nsfileext)||'PLAINTEXT',contents);
    file.setFolder(String(info.folderid));
    return Number(nlapiSubmitFile(file));
}


function bigSearch( recordtype : string , filters : any , columns : nlobjSearchColumn[] ) : nlobjSearchResult[] {
    var res = nlapiCreateSearch(recordtype, filters, columns).runSearch();

    var res_chunk, start_idx = 0 , res_final = [];
    do {
        res_chunk = res.getResults(start_idx, start_idx + 1000) || [];
        res_final = res_final.concat(res_chunk);
        start_idx += 1000;
    } while (res_chunk.length);

    return res_final;
}

function searchCols( colunas : (string|nlobjSearchColumn)[] ) : nlobjSearchColumn[] {
    return colunas.map( coluna => {
        if (typeof coluna == "string") {
            var split = (<string>coluna).split(".");
            if (split[1]) return new nlobjSearchColumn(split[1], split[0]);
            return new nlobjSearchColumn(split[0]);
        } else if (<any>coluna instanceof nlobjSearchColumn) {
            return <any>coluna;
        }
        else throw nlapiCreateError("mapSearchCol", "Entrada inválida");
    })
}


function searchResToCollection ( result : nlobjSearchResult ) : { id : string } {
    var columns = result.getAllColumns() || [];

    var ret = columns.reduce((prev:any, curr:nlobjSearchColumn) => {

        let name,join;
        if (join = curr.getJoin()) {
            name = join + "." + curr.getName();
        } else {
            name = curr.getName();
        }
        prev[name] = result.getValue(curr);
        if (result.getText(curr)) prev.textref[name] = result.getText(curr);

        return prev;

    }, {textref: {}});

    ret["id"] = result.getId();
    return ret;
}