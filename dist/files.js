///<reference path="../typings/suitescript-1.d.ts"/>
"use strict";
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
    html: 'HTMLDOC',
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
//all folders with absolute path
function allFolders() {
    var _allFolders = bigSearch('folder', null, searchCols(['name', 'parent']));
    var allFolders = _allFolders.map(searchResToCollection);
    var foldersIdxParent = allFolders.reduce(function (bef, curr) {
        curr.parent = curr.parent || '_ROOT';
        bef[curr.parent] = bef[curr.parent] || [];
        bef[curr.parent].push(curr);
        return bef;
    }, {});
    foldersIdxParent['_ROOT'].forEach(function (item) {
        function swipe(f) {
            if (foldersIdxParent[f.id]) {
                foldersIdxParent[f.id].forEach(function (inner) {
                    inner.abspath = f.abspath + '/' + inner.name;
                    swipe(inner);
                });
            }
        }
        item.abspath = "/" + item.name;
        swipe(item);
    });
    return allFolders;
}
function _relativePath(src, relativeTo) {
    var o;
    //no backwards walking
    if (src.substr(0, relativeTo.length) == relativeTo) {
        o = src.substr(relativeTo.length);
    }
    else {
        // a / b / c1 / d1
        // a / b / d
        var s_src = src.split('/').filter(function (i) { return i == true; });
        var s_rel = relativeTo.split('/').filter(function (i) { return i == true; });
        var count = 0, walk = '';
        for (var x = 0; x < s_src.length; x++) {
            if (s_rel[x] == s_src[x])
                count++;
            else {
                walk += '/' + s_src[x];
            }
        }
        for (var x = 0; x < count; x++) {
            walk = '../' + walk;
        }
        o = walk;
    }
    return o || '.';
}
function pathInfo(pathIn, baseIn, createFolders) {
    if (baseIn === void 0) { baseIn = '/'; }
    if (createFolders === void 0) { createFolders = false; }
    if (pathIn.charAt(0) == '/') {
        pathIn = pathIn.substr(1);
        baseIn = '/';
    }
    if (baseIn.substr(-1) != '/')
        baseIn += '/';
    var absPath = (baseIn + pathIn)
        .replace(/[\\]/g, '/'); //windows fix
    var _split = absPath.split('/');
    var filename = _split[_split.length - 1];
    _split.length = _split.length - 1;
    var absBase = _split.join('/');
    var absBaseSplit = _split.slice(1);
    var hasWildcard = absBaseSplit.some(function (i) { return i == '**'; });
    var _ext = filename ? filename.split('.')[1] : null;
    var prevFolder = null;
    if (!hasWildcard) {
        absBaseSplit.forEach(function (folderName) {
            var filters = [
                ['name', 'is', folderName],
                'and',
                ['parent', 'anyof', (prevFolder || '@NONE@')]
            ];
            var res_folder = nlapiSearchRecord('folder', null, filters);
            if (!res_folder && !createFolders) {
                throw nlapiCreateError('FOLDER_NOT_FOUND', "Folder " + folderName + " not found!", true);
            }
            else if (!res_folder && createFolders) {
                var newFolderRec = nlapiCreateRecord('folder');
                newFolderRec.setFieldValue('name', folderName);
                newFolderRec.setFieldValue('parent', prevFolder);
                prevFolder = nlapiSubmitRecord(newFolderRec);
            }
            else {
                prevFolder = res_folder[0].getId();
            }
        });
        return {
            folderid: prevFolder,
            filename: filename ? filename : null,
            fileext: _ext,
            nsfileext: _ext ? EXT_TYPES[_ext] : null,
            pathabsolute: filename ? absPath : null,
            pathrelative: filename ? _relativePath(absPath, baseIn) : null,
            baseabsolute: absBase,
            baserelative: _relativePath(absBase, baseIn)
        };
    }
    else {
        var preWildcard_1 = '', postWildcard_1 = '', isAfter_1 = false;
        absBaseSplit.forEach(function (item) {
            if (item == '**')
                isAfter_1 = true;
            else if (isAfter_1)
                postWildcard_1 += '/' + item;
            else {
                preWildcard_1 += '/' + item;
            }
        });
        var found = allFolders().filter(function (folder) {
            var pre = !preWildcard_1.length || (folder.abspath.substr(0, preWildcard_1.length) == preWildcard_1);
            var post = !postWildcard_1.length || (folder.abspath.substr(-postWildcard_1.length) == postWildcard_1);
            return pre && post;
        }).map(function (folder) {
            var pabs = filename ? folder.abspath + '/' + filename : null;
            return {
                folderid: folder.id,
                pathabsolute: pabs,
                pathrelative: filename ? _relativePath(pabs, baseIn) : null,
                baseabsolute: folder.abspath,
                baserelative: _relativePath(folder.abspath, baseIn)
            };
        });
        return {
            filename: filename ? filename : null,
            fileext: _ext,
            nsfileext: _ext ? EXT_TYPES[_ext] : null,
            baseabsolute: preWildcard_1,
            baserelative: _relativePath(preWildcard_1, baseIn),
            tails: found
        };
    }
}
exports.pathInfo = pathInfo;
exports.save = saveFile;
function saveFile(path, contents) {
    var info = pathInfo(path, undefined, true);
    var file = nlapiCreateFile(info.filename, info.nsfileext || 'PLAINTEXT', contents);
    file.setFolder(String(info.folderid));
    return Number(nlapiSubmitFile(file));
}
exports.saveFile = saveFile;
function bigSearch(recordtype, filters, columns) {
    var res = nlapiCreateSearch(recordtype, filters, columns).runSearch();
    var res_chunk, start_idx = 0, res_final = [];
    do {
        res_chunk = res.getResults(start_idx, start_idx + 1000) || [];
        res_final = res_final.concat(res_chunk);
        start_idx += 1000;
    } while (res_chunk.length);
    return res_final;
}
function searchCols(colunas) {
    return colunas.map(function (coluna) {
        if (typeof coluna == "string") {
            var split = coluna.split(".");
            if (split[1])
                return new nlobjSearchColumn(split[1], split[0]);
            return new nlobjSearchColumn(split[0]);
        }
        else if (coluna instanceof nlobjSearchColumn) {
            return coluna;
        }
        else
            throw nlapiCreateError("mapSearchCol", "Entrada inválida");
    });
}
function searchResToCollection(result) {
    var columns = result.getAllColumns() || [];
    var ret = columns.reduce(function (prev, curr) {
        var name, join;
        if (join = curr.getJoin()) {
            name = join + "." + curr.getName();
        }
        else {
            name = curr.getName();
        }
        prev[name] = result.getValue(curr);
        if (result.getText(curr))
            prev.textref[name] = result.getText(curr);
        return prev;
    }, { textref: {} });
    ret["id"] = result.getId();
    return ret;
}
