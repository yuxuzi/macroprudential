//
// Functions and variables declared at the top scope so that other .js files can
// use them.
//
var getXYCoord;
var tableIndexCache;
var getTableFromCell;
var splitElement;
var undecorateInnerHTML;
var removeAllChildren;
var getActiveSheet;
var onClickCoordinateMarkerHandler;
var debugLog;
var getCallbackUrl;
var getAlphaNumericExcelCoordinates;
var getElementFromTableCoordinates;
var getSheetIdName;
var searchRoot;
var getTableFromSheetIndex;

/**
 * A dense array, one element per sheet - a struct with fields:
 * Cells, RowsHeights, DefaultRowHeight, Protected,
 * WorkbookLockRevision, WorkbookLockStructure, WorkbookLockWindows.
 * Cells is a map from zero-index coordinate x,y pair to formula string.
 */
var formulaCache = [];
var formulaCacheNsid = null;
var formulaCacheSjid = null;

/// Tracks the HTML elements currently selected by a user: array of Highlight classes
var highlighted = [];
/**
 * this is set to true during the running of unit tests and then set false
 * This is so elements can do test speciifc things like annotate themselves with XY based ids
 */
var is_test = false;
/// Has the user decided to temporarily show all hidden columns in this excell workbook
var allHiddenColumnsShown = false;
/// have we ever encountered a hidden column: then we need more advanced L/R arrow treatment
var anyHiddenColumns = false;
/// this is the newest Nsid/Sjid pair returned by the poll function (triggered by notserver)
var greatestKnownSjid = g_cur_sjid;
var greatestKnownNsid = g_cur_nsid;
/// so we always get unique iframe id's
var iframeCounter = 0;

// Handles communication with parent via postMessage
var frameMessenger = null;

// The keydown keys handled by the parent keydown handler
var keydownKeysHandledByParent = {};

// Keeps track of zooming
var _zoomLevel = 5;
var _ZOOM_SCALES = ["0.25", "0.5", "0.7", "0.8", "0.9", "1.0", "1.1", "1.25", "1.5", "1.75", "2.0"];

// Tracks if the mouse has moved recently
var _mousemoveTimeout = null;

(function() {
    getXYCoord = function(el) {
        var table = getTableFromCell(el);
        var retval, cellIndex = el.cellIndex;
        var rowIndex = el.parentNode.rowIndex;
        tableIndexCache.refresh(table);
        return [cellIndex + tableIndexCache.cellColOffset[rowIndex][cellIndex],
                rowIndex + tableIndexCache.rowOffset[rowIndex]];
    };
    debugLog = function(){}
    if ((document.location.href.indexOf("block-dbdev.dev.corp") != -1
         || document.location.href.indexOf("dbxdebug") != -1) && console && console.log) {
        debugLog = function() { return console.log.apply(console, arguments); }
    }

    /**
     * This creates the div that informs the user of the current coordinate on their moused-over
     * or clicked cell
     */
    var createCoordinateDiv = function(className) {
        var div =document.createElement('div');


        if (className){
            div.className = className;
        }
        else{
            div.style.background = 'rgba(128, 128, 128, 0.5)';
            div.style.color = 'black';
            div.style.pointerEvents = 'none';
            div.style.fontSize = 'small';
        }

        div.appendChild(document.createTextNode("O0"));
        return div;
    };

    /// This takes a Td, and if excel requests it hidden by setting width=0 give it hidden css class
    var annotateHiddenTd = function(td) {
        td.className += " hidden";
        if (td.hasAttribute("width")) {
            var oldAttribute = td.getAttribute("width");
            if (parseInt(oldAttribute) === 0) {
                td.setAttribute("width", "80");
            }
        }
    };
    /**
     * This unhides a Td by removing the hidden attribute
     * (?:^|\s) asks the regex to either get a space char or beginning of string
     * (?!\S) makes sure that no nonspace character follows the classname
     */
    var annotateNonhiddenTd = function(td) {
        td.className = td.className.replace(/(?:^|\s)hidden(?!\S)/g, "");
    }
    /**
     * This function makes sure an array of newElements has the correct hidden class parameter
     * depending on the hiddenness of the corresponding column of the table with the newElements.
     * It goes through the new elements, getting their x coordinates and then seeing it matches the
     * hiddenColumns returned by getAndCanonicalizeHiddenColumnHeaders
     */
    var ensureHiddenClass = function(newElements) {
        var numNewElements = newElements.length;
        if (numNewElements === 0) {
           return 0;
        }
        var hiddenColumns = getAndCanonicalizeHiddenColumnHeaders(getTableFromCell(newElements[0]));
        for (var i = numNewElements - 1; i >= 0; --i) {
            var el = newElements[i];
            var xy = getXYCoord(el);
            var isHidden = hiddenColumns[xy[0]];
            var displayHidden = el.className.indexOf("hidden") !== -1;
            if (displayHidden !== isHidden) {
                if (isHidden) {
                    annotateHiddenTd(el);
                } else {
                    annotateNonhiddenTd(el);
                }
            }
        }
    };

    /**
     * Apply the 'hidden' class to the colgroups of the hidden columns. The same
     * class is applied to the <td>s in those columns too.
     * This is needed so they can be hidden/revealed properly.
     */
    var modifyColGroups = function(table) {
        var colgroup = table.getElementsByTagName('colgroup')[0];
        var groups = colgroup.getElementsByTagName('col');
        for (colIndex = 0; colIndex < groups.length; ++colIndex) {
            var col = groups[colIndex];
            if (parseInt(col.getAttribute("width")) === 0) {
                // We need to override the default class. Colgroups for hidden
                // columns by default have a class with "display:none". That
                // makes the column always take up space (?!?). If the
                // "display:none" wouldn't be there, a "display: table-column;"
                // would take effect (default chrome styling), which makes the
                // column _not_ take space.
                col.className = "hidden";
            }
        }
    };

    /**
     * This function looks at the first row in the table and computes the desired width
     * of each item in the table by looking for width=0 or 'hidden' css class
     * in either case it sets the width to 80 and activates the hidden css class
     */
    var getAndCanonicalizeHiddenColumnHeaders = function(table) {
        modifyColGroups(table);
        var oldTableDisplay = table.style.display;
        var alteredDisplayStyle = false;
        var columnHidden = [];
        var rows = getRowsFromTable(table);
        if (rows && rows.length > 0) {
            var colIndex;
            var firstRowChildren = rows[0].children;
            var numCol = firstRowChildren.length;
            for (colIndex = 0; colIndex < numCol; ++colIndex) {
                var col = firstRowChildren[colIndex];
                var isHidden = false;
                if (col.className.indexOf("hidden") !== -1) {
                    anyHiddenColumns = true;
                    isHidden = true;
                } else if (parseInt(col.getAttribute("width")) === 0) {
                    anyHiddenColumns = true;
                    isHidden = true;
                    if (!alteredDisplayStyle) {
                        alteredDisplayStyle = true;
                        table.style.display = "none";
                    }
                    annotateHiddenTd(col);
                }
                var colSpan = parseInt(col.getAttribute('colspan') || 1);
                for (var cs = 0; cs < colSpan; ++cs) {
                    columnHidden.push(isHidden);
                }
            }
        }
        if (alteredDisplayStyle) {
            table.style.display = oldTableDisplay;
        }
        return columnHidden;
    }
    /**
     * This function takes a table, computes the headers and then uses the headers
     * to compute whether each cell in the entire table should be labeled 'hidden'
     */
    var annotateHiddenColumns = function(table) {
        var oldTableDisplay = table.style.display;
        var columnHidden = getAndCanonicalizeHiddenColumnHeaders(table);
        var retval = false;
        for (var i=columnHidden.length - 1; i >= 0; --i) {
            if (columnHidden[i]) {
                retval = true;
                break;
            }
        }
        // lets load the table index cache
        tableIndexCache.refresh(table);
        debugLog("Hidden Columns ",columnHidden);
        var alteredDisplayStyle = false;
        var rows = getRowsFromTable(table);
        for (var rowIndex = rows.length - 1; rowIndex > 0; --rowIndex) {
            var rowChildren = rows[rowIndex].children;
            var numCol = rowChildren.length;
            var rowColOffset = tableIndexCache.cellColOffset[rowIndex];
            for (colIndex = 0; colIndex < numCol; ++colIndex) {
                var cellColOffset = rowColOffset[colIndex];
                if (columnHidden[colIndex + cellColOffset]) {
                    var col = rowChildren[colIndex];
                    if (col.className.indexOf("hidden") === -1) {
                        if (!alteredDisplayStyle) {
                            alteredDisplayStyle = true;
                            table.style.display = "none";
                        }
                        annotateHiddenTd(col);
                    }
                }
            }
        }
        if (alteredDisplayStyle) {
            table.style.display = oldTableDisplay;
        }
        return retval;
    };
    /// sets the table css class to correspond to the user-desired behavior of show hidden columns
    var setTableMasterHiddenClassName = function(table, showHidden) {
        var newClassName;
        if (showHidden) {
           newClassName = "showall";
        } else {
           newClassName = "shownone";
        }
        table.className=table.className.replace(/(?:^|\s)showall(?!\S)/g,"")
            .replace(/(?:^|\s)shownone(?!\S)/g,"") + " " + newClassName;
    }
    /// this determines the text on the hidden columns toggle button
    var decorateHiddenColumnButton = function() {
        if (allHiddenColumnsShown) {
            return collapse_hidden_label;
        } else {
            return reveal_hidden_label;
        }
    }

    var showOrHideHiddenColumns = function(show) {
        allHiddenColumnsShown = show;
        var i = 0;
        var table = getTableFromSheetIndex(i);
        while (table) {
            // Don't show hidden columns on protected sheets.
            var sheetProtected = formulaCache.length > i && formulaCache[i] !== "undefined" &&
                formulaCache[i] !== null && formulaCache[i]["Protected"];
            setTableMasterHiddenClassName(table, show && !sheetProtected);
            ++i;
            table = getTableFromSheetIndex(i);
        }
    }

    var sheetHasHiddenColumns = [];

    /**
     * This makes sure an entire iframe of multiple tables has all the cells that are collapsed
     * set to the hidden css class and width 80 if they are in the header.
     */
    var ensureHiddenIframeStyle = function(contentDocument) {
        var i = 0;
        var table = getTableFromSheetIndex(i);
        while (table) {
            var anyHiddenColumnsSubtable = annotateHiddenColumns(table);
            sheetHasHiddenColumns[i] = anyHiddenColumnsSubtable;
            anyHiddenColumns = anyHiddenColumns || anyHiddenColumnsSubtable;
            ++i;
            table = getTableFromSheetIndex(i);
        }
        showOrHideHiddenColumns(allHiddenColumnsShown);
    };

    // If there are any hidden columns on the current sheet, show the
    // "Collapse"/"Reveal" button.
    var maybeAddRevealHiddenColumnsButton = function() {
        var activeSheetIdx = getActiveSheet();
        var anyHiddenColumns = sheetHasHiddenColumns[activeSheetIdx];
        var sheetFormulaCache = formulaCache[activeSheetIdx];
        var sheetProtected = typeof sheetFormulaCache !== "undefined" &&
            sheetFormulaCache !== null && sheetFormulaCache["Protected"];
        var buttonId = "toggleHiddenColumnsButton";

        // Remove the reveal button, if there was one.
        var button = document.getElementById(buttonId);
        if (button !== null) {
            button.parentNode.removeChild(button);
        }

        // Do I need to show the reveal button?
        if (!sheetProtected && anyHiddenColumns) {
            var toggleHiddenColumnsButton = document.createElement("a");
            toggleHiddenColumnsButton.href = "#";
            toggleHiddenColumnsButton.id = buttonId;
            toggleHiddenColumnsButton.className = "loaded";
            toggleHiddenColumnsButton.innerHTML = decorateHiddenColumnButton();
            toggleHiddenColumnsButton.onclick = function() {
                showOrHideHiddenColumns(!allHiddenColumnsShown);
                toggleHiddenColumnsButton.innerHTML = decorateHiddenColumnButton();
            };
            var parent = document.body;
            if (document.getElementById("tabstrip")) {
                var parent = document.getElementById("tabstrip");
            }
            parent.appendChild(toggleHiddenColumnsButton);
        }
    };

    /// this figures out which sheet index a given parent is by looking at its wrapper div's id
    var getSheetIndexFromTable = function(table) {
        return parseInt(table.parentNode.id.split("sheet")[1]) - 1;
    }
    /// this gets an ID string from a sheetIndex so the appropriate item may be getElementById'd
    getSheetIdName = function(sheetIndex) {
        sheetIndex +=1; // sheet id's are one indexed for some reason
        return "sheet" + Math.floor(sheetIndex/100) + ""
            + Math.floor((sheetIndex/10)%10) + "" + Math.floor(sheetIndex%10);
    }

    // This global style is added to html pages to so hidden columns can be
    // optionally collapsed.  All the hidden columns in the table will have a
    // 'hidden' CSS class. This class either hides or reveals the column, based
    // on whether the table has the 'shownone' or 'showall' class.
    var highlightStyle = 'table.shownone .hidden{opacity:0; width:0px;} ' +
        'table.showall .hidden{width:80px;} ' +
        'td.highlight, th.highlight{border: 3px solid #2895f1;}' +
        'td input, th input {border:0px, background-color:rgba(0,0,0,0);width:100%;}';

    // This tracks how many rows are remaining in a given cell row span
    var RowSpan = function(rowsRemaining, start, width) {
        this.rowsRemaining = rowsRemaining;
        this.start = start;
        this.width = width;
    }

    /// This clones an element's tagName and style for inserting blank tds
    var cloneElement = function(el, dx, dy, colSpan, rowSpan) {
       var newTagName = el.tagName;
       if (dx > 0 &&  dy > 0 && el.tagName.toLowerCase() == 'th') {
           newTagName = 'td';
       }
       var retval = document.createElement(newTagName);
       retval.style = el.style;
       if (is_test) {
           var oldX = parseInt(el.id.split("_")[0]);
           var oldY = parseInt(el.id.split("_")[1]);
           retval.id = (oldX + dx) + "_" + (oldY + dy);
           retval.innerHTML = retval.id;
       }
       return retval;
    }
    /**
     * Parse the given formulas metadata, insert the formulas into the formulaCache.
     */
    var parseFormulas = function(formulaJSON) {
        var data = formulaJSON;
        if (data['nsid'] === g_cur_nsid && data['sjid'] >= g_cur_sjid &&
            (formulaCacheSjid === null || formulaCacheSjid <= data['sjid'])) {

            formulaCache = data['formulas'];
            formulaCacheNsid = data['nsid'];
            formulaCacheSjid = data['sjid'];
            // make sure any highlighted elements that are the same get updated
            for (var i = highlighted.length - 1; i >= 0; --i) {
                var activeSheet = highlighted[i].activeSheet
                if (activeSheet < formulaCache.length) {
                    var key = highlighted[i].x + ',' + highlighted[i].y;
                    if (key in formulaCache[activeSheet]) {
                        var formula = formulaCache[activeSheet].Cells[key];
                        var inputEl = highlighted[i].el.firstChild;
                        if (inputEl.tagName && inputEl.tagName.toLowerCase() === 'input'
                            && inputEl.getAttribute('data-original') === inputEl.value) {
                            if (formula != inputEl.value) {
                                var selectionStart = inputEl.selectionStart;
                                var selectionEnd = inputEl.selectionEnd;
                                var origValue = inputEl.value
                                inputEl.setAttribute('data-original', formula);
                                inputEl.value = formula;
                                if (typeof(selectionStart) === "number") {
                                    inputEl.selectionStart = selectionStart;
                                    if (origValue.length === selectionEnd) {
                                        inputEl.selectionEnd = formula.length;
                                    } else {
                                        inputEl.selectionEnd = selectionEnd;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * The TableIndexCache is a class to allow us to go back and forth between HTML
     * (cellIndex, rowIndex) -> to spreadsheet coordinates (eg AZ1)
     * The way it does this is by having a row offset array that tracks row thicknesses
     * It also has a row, col map to col offset tracking column thicknesses to the left
     * Every time the table is altered, the purge function forces a recompute lazily
     * from the whole HTML table plus the row heights
     */
    function TableIndexCache() {
        this.purge();
    }
    TableIndexCache.prototype.purge = function() {
        this.colHidden = null;
        this.rowOffset = null;
        this.rowHeight = null;
        this.cachedElement = null;
        this.defaultRowHeight = null;
        this.rowMultiplier = null;
    }
    tableIndexCache = new TableIndexCache();


    /// Takes a 0-indexed x and y coordinates and converts it to spreadsheet 'AB1' style coordinates
    getAlphaNumericExcelCoordinates = function(x, y) {
        var A = "A".charCodeAt(0);
        var alpha = "";
        x += 1;
        do {
            x -= 1;
            var remainder = x % 26;
            alpha = String.fromCharCode(A + remainder) + alpha
            x -= remainder;
            x /= 26;
            x = Math.round(x);
        } while (x > 0);
        return alpha + (y + 1);
    };

    removeAllChildren = function(el) {
        el.style.display="none";
        while ((elChild = el.firstChild) !== null) {
            el.removeChild(elChild);
        }
        el.style.display="";
    }

    /**
     * This gets the index of the current sheet that is being viewed by the user
     */
    getActiveSheet = function() {
       var tabstrip = document.getElementById("tabstrip");
       if (!tabstrip) return 0;
       var currentLinks = tabstrip.getElementsByClassName("current");
       var currentLink = null;
       if (currentLinks.length) {
          currentLink = currentLinks[0];
       }
       if (!currentLink) return 0;
       var tabStripChildren = tabstrip.children;
       for (var i = tabStripChildren.length - 1; i >= 0; --i) {
           if (tabStripChildren[i] === currentLink
               || tabStripChildren[i] === currentLink.parentNode) {
               return i;
           }
       }
       return 0;
    }
    var ensureColIndex = function(table, row, x) {
        var rowChildren = row.children;
        var edge = 0;
        var el;
        var newElements = [];
        do {
            el = document.createElement('td');
            el.style.width='85px';
            row.appendChild(el);
            tableIndexCache.purge(); // FIXME: slow
            newElements.push(el);
        } while(getXYCoord(el)[0] < x);
        ensureHiddenClass(newElements);
        return el;
    };
    var ensureRowIndex = function(table, rows, rowY) {
        var modified = false;
        var newElements = [];
        var elY = 0;
        if (rowY >= rows.length) {
            modified = true;
            var oneRowOnly = (rowY == rows.length);
            for (var i = 0; i < (oneRowOnly ? 1 : 2); ++i) {
                tableIndexCache.refresh(table)
                var tic = tableIndexCache.cellColOffset;
                var lastWidth = tic[elY].length - 1
                    + tic[elY][tic[elY].length - 1];
                var lastCell = rows[elY].children[rows[elY].children.length - 1]
                lastWidth += parseInt(lastCell.colSpan || 1);
                var newElement = cloneElement(lastCell,0,1);
                newElement.colSpan = lastWidth;
                var newRow = document.createElement('tr');
                var newHeight = Math.round(tableIndexCache.defaultRowHeight /
                                       tableIndexCache.rowMultiplier)
                if (i == 0 && !oneRowOnly) {
                    newHeight *= rowY - rows.length;
                }
                newRow.setAttribute("height", newHeight);
                newRow.style.height = newHeight + "px";
                rows[rows.length-1].parentNode.appendChild(newRow);
                newRow.appendChild(newElement);
                rows = getRowsFromCell(newElement);
                newElements.push(newElement);
            }
        }
        if (modified) {
            tableIndexCache.purge();
            ensureHiddenClass(newElements);
        }
        return rows;
    }
    var coordinateMarkers = [createCoordinateDiv(),
                             createCoordinateDiv(),
                             createCoordinateDiv("formula_panel")];

    undecorateInnerHTML = function(el) {
       for (var i = coordinateMarkers.length - 1; i >= 0; --i) {
           if (coordinateMarkers[i].parentNode === el) {
               el.removeChild(coordinateMarkers[i]);
           }
       }
    };
    splitElement = function(el, subX, subY) {
        var colSpan = parseInt(el.getAttribute('colspan') || 1);
        var rowSpan = parseInt(el.getAttribute('rowspan') || 1);
        if (colSpan === 1 && rowSpan === 1 && subX === 0 && subY === 0) {
            return el;
        }
        var xyCoords = getXYCoord(el);
        var xCoord = xyCoords[0];
        var yCoord = xyCoords[1];
        var retval = el;
        if (subX >= colSpan) {
            subX = colSpan - 1;
        }
        if (subY >= rowSpan) {
            subY = rowSpan - 1;
        }
        var newElements = [];
        if (rowSpan > 1) {
            var table = getTableFromCell(el);
            tableIndexCache.refresh(table);
            var tableCache = tableIndexCache.cellColOffset;
            var rows = getRowsFromTable(table);
            for (var i = 1; i < rowSpan; ++i) {
                // add pristine elements into the rows after the current row
                var htmlRowIndex = lowerBound(tableIndexCache.rowOffset, yCoord + i);
                rows = ensureRowIndex(table, rows, htmlRowIndex);
                var numColsInThisRow = 0;
                if (htmlRowIndex < tableCache.length) {
                    var rowOffset = tableCache[htmlRowIndex];
                    numColsInThisRow = rowOffset.length;
                }
                var tdOffset = 0;
                // first we find the location in the table to add the items to.
                // we could do a binary search here, but this keeps it simpler
                for (var j = 0; j < numColsInThisRow; ++j) {
                    if (j + tableCache[htmlRowIndex][j] >= xCoord) {
                        tdOffset = j;
                        break;
                    }
                }
                // now that we know where to insert the data, we just need to clone
                // an appropriate number of items for that row
                var row = rows[htmlRowIndex];
                var cols = row.children;
                for (var j=0; j < colSpan; ++j) {
                    var newElement = cloneElement(el, colSpan - j - 1, i, 1, 1);
                    row.insertBefore(newElement,
                                     tdOffset < cols.length ? cols[tdOffset]: null);
                    newElements.push(newElement);
                    if (i == subY && colSpan - j - 1 == subX) {
                        retval = newElement;
                    }
                }
            }
        }
        for (var j = 1; j < colSpan; ++j) {
            var newElement = cloneElement(el, colSpan - j, 0, 1, 1);
            el.parentNode.insertBefore(newElement, el.nextSibling);
            newElements.push(newElement);
            if (subY == 0 && colSpan - j == subX) {
                retval = newElement;
            }
        }
        el.setAttribute("colSpan", 1);
        el.setAttribute("rowSpan", 1); // this is the good stuff
        tableIndexCache.purge();
        ensureHiddenClass(newElements);
        return retval;
    }
    var getActiveColSpan = function(activeColSpan, index) {
        var retval = 0;
        if (activeColSpan[index]) {
            var activeSpansStartingHere = activeColSpan[index];
            var len = activeSpansStartingHere.length;
            for (var i = 0; i < len; ++i) {
                retval += activeSpansStartingHere[i].width;
                activeSpansStartingHere[i].rowsRemaining -= 1;
                if (activeSpansStartingHere[i].rowsRemaining == 0) {
                    if (i + 1 < len) {
                        activeSpansStartingHere[i] = activeSpansStartingHere[len - 1];
                    }
                    activeSpansStartingHere[len - 1] = undefined;
                    len -= 1;
                    activeSpansStartingHere.length -= 1;
                }
            }
        }
        return retval;
    };
    TableIndexCache.prototype.refresh = function(table) {
        if (this.cellColOffset === null || this.cachedElement !== table) {
            var activeSheetIndex = getSheetIndexFromTable(table);
            var defaultXlsxHeight = 15;
            var xlsxHeightDeviations = {};
            if (activeSheetIndex < formulaCache.length) {
                if ("DefaultRowHeight" in formulaCache[activeSheetIndex]) {
                    defaultXlsxHeight = formulaCache[activeSheetIndex]["DefaultRowHeight"];
                }
                if ("RowsHeight" in formulaCache[activeSheetIndex]) {
                    xlsxHeightDeviations = formulaCache[activeSheetIndex]["RowsHeight"];
                }
            }
            var activeColSpan = [];
            var nextActiveColSpan = []
            var rows = getRowsFromTable(table);
            var numRows = rows.length;
            var rowHeightMultiplier = 15/20.;//FIXME: not sure this is true: we may need to go
                                             // looking for a row that has some text
                                             // but no custom height and compare to listed text
            this.rowMultiplier = rowHeightMultiplier;
            this.defaultRowHeight = defaultXlsxHeight
            this.cachedElement = table
            this.cellColOffset = [];
            this.rowOffset = [];
            this.rowHeight = [];
            var cumulativeOffset = 0;
            for (var i = 0; i < numRows; ++i) {
                var row = rows[i];
                var height = row.getAttribute("height");
                var xlsxHeightValue = defaultXlsxHeight;
                var originalIndex = cumulativeOffset + i;
                if (originalIndex in xlsxHeightDeviations) {
                    xlsxHeightValue = xlsxHeightDeviations[originalIndex];
                }
                var heightVal = parseFloat(height)
                if (!isNaN(heightVal)) {
                    heightVal *= rowHeightMultiplier;
                } else {
                    heightVal = 15;
                }
                var rowThickness = Math.round(heightVal/xlsxHeightValue);
                if (rowThickness < 1) {
                    rowThickness = 1;
                }
                this.rowOffset.push(cumulativeOffset);
                this.rowHeight.push(rowThickness);
                cumulativeOffset += rowThickness - 1;
            }
            for (var i = 0; i < numRows; ++i) {
                var offset = 0;
                var row = rows[i];
                // saves dx that an individual column should have
                var cells = row.children;
                var numCells = cells.length;
                this.cellColOffset.push([]);
                for (var j=0; j < numCells; ++j) {
                    var cell = cells[j];
                    var colSpan = parseInt(cell.getAttribute('colspan') || 1);
                    var rowSpan = parseInt(cell.getAttribute('rowspan') || 1);
                    var oldOffset;
                    do {
                        oldOffset = offset;
                        offset += getActiveColSpan(activeColSpan, j + offset);
                    } while (oldOffset < offset);
                    this.cellColOffset[i].push(offset);
                    if (rowSpan > 1) {
                       var newRowSpan = new RowSpan(rowSpan - 1, j + offset, colSpan);
                       nextActiveColSpan.push(newRowSpan);
                    }
                    offset += colSpan - 1; // add our current colspan beyond 1 to the offset
                }
                for (var j = nextActiveColSpan.length - 1; j >= 0; --j) {
                    var newSpan = nextActiveColSpan[j];
                    if (activeColSpan[newSpan.start]) {
                        activeColSpan[newSpan.start].push(newSpan);
                    } else {
                        activeColSpan[newSpan.start] = [newSpan];
                    }
                }
                nextActiveColSpan.length = 0;
            }
        }
    }
    getTableFromCell = function(el) {
        var table = el.parentNode.parentNode;
        if (table.tagName.toLowerCase() !== "table") {
            table = table.parentNode;
        }
        if ((!table) || (!table.tagName) || table.tagName.toLowerCase() !== "table") {
           throw "Not table cell";
        }
        return table;
    }
    var getRowsFromCell = function(cell) {
        return getRowsFromTable(getTableFromCell(cell));
    };
    var getRowsFromTable = function(table) {
        if (table.tagName.toLowerCase() !== "table") {
            table = table.parentNode;
        }
        if (table.tagName.toLowerCase() !== "table") {
           throw "Not table cell";
        }
        var rows = table.children;
        var numRows = rows.length;
        for (var i=0; i< numRows; ++i) {
            if (rows[i].tagName.toLowerCase() == "tbody") {
                rows = rows[i].children;
                break;
            }
        }
        return rows;
    };
    var lowerBound = function(rowCache, offset) {
        var len = rowCache.length;
        var max = len - 1;
        var min = 0;
        while (min <= max) {
            var cur = Math.floor((max + min) / 2);
            var val = cur + rowCache[cur]
            if (val === offset) {
                return cur;
            }
            if (val > offset) {
                max = cur - 1;
            } else {
                min = cur + 1;
            }
        }
        if (min + rowCache[min] <= offset) {
            return min;
        }
        if (min > 0 && min - 1 + rowCache[min - 1] <= offset) {
            return min - 1;
        }

        return -1;
    };
    var splitThickRows = function(row, yOffset, thickness, newRowHeight) {
        row.setAttribute("height", newRowHeight);
        row.style.height = newRowHeight + "px";
        var insertBefore = row.nextSibling;
        var tds = row.children;
        for (var j = tds.length - 1; j >= 0; --j) {
            undecorateInnerHTML(tds[j]);
        }
        for (var i=1; i < thickness; ++i) {
            var curInsert = row.cloneNode(true);
            if (is_test) {
                tds = curInsert.children;
                for (var j = tds.length - 1; j >= 0; --j) {
                    var oldX = parseInt(tds[j].id.split("_")[0]);
                    var oldY = parseInt(tds[j].id.split("_")[1]);
                    var newKey = oldX + "_" + (oldY + i);
                    tds[j].id = newKey;
                    tds[j].innerHTML = newKey;
                }
            }
            row.parentNode.insertBefore(curInsert, insertBefore);
            if (yOffset == i) {
                row = curInsert;
            }
        }
        tableIndexCache.purge();
        return row;
    };
    getElementFromTableCoordinates = function(table, x, y) {
        var tableChildren = table.children;
        var rows = null;
        for (var i = tableChildren.length - 1; i >= 0; --i) {
            if (tableChildren[i].tagName.toLowerCase() == "tr") {
                rows = tableChildren.children;
                break
            }
            var subChildren = tableChildren[i].children;
            if (subChildren.length && subChildren[0].tagName.toLowerCase() == "tr") {
                rows = subChildren;
                break;
            }
        }
        if (rows !== null) {
            tableIndexCache.refresh(table);
            whichRowIndex = lowerBound(tableIndexCache.rowOffset, y);
            tableIndexCache.refresh(table);
            var row;
            var yOffset = y - (whichRowIndex + tableIndexCache.rowOffset[whichRowIndex]);
            var rowSplitFactor = tableIndexCache.rowHeight[whichRowIndex];
            if (yOffset < rowSplitFactor) {
                row = rows[whichRowIndex]
                if (rowSplitFactor > 1) {
                    row = splitThickRows(row, yOffset, rowSplitFactor,
                                         Math.round(tableIndexCache.defaultRowHeight /
                                                    tableIndexCache.rowMultiplier));
                    tableIndexCache.refresh(table);
                }
            } else {
                rows = ensureRowIndex(table, rows, whichRowIndex + yOffset - rowSplitFactor + 1);
                whichRowIndex = rows.length - 1; // added just enough
                tableIndexCache.refresh(table);
            }
            var cache = tableIndexCache.cellColOffset;
            var subx = -1;
            var suby;
            var index = -1;
            for (suby = 0; suby <= whichRowIndex; ++suby) {
                if (y - suby < 0) {
                    throw "Error in finding overlapping cell for " + x + "," + y;
                }
                row = rows[whichRowIndex - suby];
                var rowCache = cache[whichRowIndex - suby];
                index = lowerBound(rowCache, x);
                subx = x - (index + rowCache[index]);
                if (index >= 0 && parseInt(row.children[index].colSpan || 1) > subx) {
                    break;
                }
            }
            var cell;
            if (index < 0 || index >= row.children.length) {
                cell = ensureColIndex(table,
                                      rows[whichRowIndex],
                                      x);
            } else {
                cell = row.children[index];
                var cellRowSpan = parseInt(cell.rowSpan || 1)
                var cellColSpan = parseInt(cell.colSpan || 1)
                if (cellRowSpan <= suby) {
                    // off the end of the table, not covered by any colspans: use the row directly
                    cell = ensureColIndex(table,
                                          rows[whichRowIndex],
                                          x);
                }
            }
            if (cellRowSpan == 1 && cellColSpan == 1) {
                return cell;
            }
            return splitElement(cell, subx, suby);
        }
        return null;
    };

    // Returns the <table> element for a particular sheet.
    getTableFromSheetIndex = function(sheetIndex) {
        var wrapper = document.getElementById("wrapper");
        var sheet = document.getElementById(getSheetIdName(sheetIndex));
        if (sheet === null) {
            return null;
        }
        var sheetChildren = sheet.children;
        for (var tableIndex=sheetChildren.length - 1; tableIndex >= 0; --tableIndex) {
            if (sheetChildren[tableIndex].tagName.toLowerCase() == "table") {
                return sheetChildren[tableIndex];
            }
        }
        return null;
    }
    getCallbackUrl = function(new_endpoint) {
        return document.URL.replace("/" + endpoint + "/", "/" + new_endpoint + "/");
    };

    function isDescendant(parent, child) {
         var node = child.parentNode;
         while (node != null) {
             if (node == parent) {
                 return true;
             }
             node = node.parentNode;
         }
         return false;
    }

    var displayCoordinatesHandler = function(target, poptarget) {
        var lastTargetedCell = null;
        return function(e) {
            var table = null;
            var cell = e.target;
            if (cell !== null && cell.tagName && cell.tagName.toLowerCase() === 'input') {
                cell = cell.parentNode;
            }
            if (cell !== null && cell !== lastTargetedCell) {
                try {
                    table = getTableFromCell(cell);
                }catch (exc) {

                }
                if (table !== null) {
                    var oldParent = target.parentNode;
                    if (oldParent == cell) {
                        return;
                    }
                    target.style.display = "none";
                    var xy = getXYCoord(cell);
                    var x = xy[0];
                    var y = xy[1];
                    var label = getAlphaNumericExcelCoordinates(x, y);
                    if (oldParent !== null) {
                        oldParent.removeChild(target);
                        if (isDescendant(oldParent,poptarget)) {
                            oldParent.removeChild(poptarget);
                        }
                    }
                    lastTargetedCell = cell;
                    lastTargetedCell.style.position = 'relative';
                    target.style.position = 'absolute';
                    if (cell.getAttribute('align') === 'right'
                        && !(cell.firstChild !== null && cell.firstChild.tagName
                             && cell.firstChild.tagName.toLowerCase() === 'input')) {
                       target.style.left = '2%';
                       target.style.right = '';
                    } else {
                       target.style.right = '2%';
                       target.style.left = '';
                    }
                    target.style.top = '2%';
                    target.firstChild.nodeValue = label;
                    lastTargetedCell.appendChild(target);
                    target.style.display = "block";

                    if (poptarget) {
                        var key = x + ',' + y;
                        var activeSheetIdx = getActiveSheet();
                        if (key in formulaCache[activeSheetIdx].Cells) {
                            var formula = formulaCache[activeSheetIdx].Cells[key];

                            poptarget.style.display = "none";
                            var label = "<span class='formula'>" + formula + "</span>";

                            lastTargetedCell = cell;
                            lastTargetedCell.style.position = 'relative';
                            poptarget.style.position = 'absolute';

                            poptarget.style.top = "120%";
                            poptarget.style.right = "-3%";

                            poptarget.innerHTML = label;
                            lastTargetedCell.appendChild(poptarget);
                            poptarget.style.display = "block";
                        }
                    }

                }
            }
        };
    };

    onClickCoordinateMarkerHandler = displayCoordinatesHandler(coordinateMarkers[0]);

    var iframeLoadTimer;
    var mouseOutCallback = function(evt) {
                    debugLog("Committing all outstanding items",evt.target,evt.srcElement);

    };

    var pad = function(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    }

    // Overwrite the onclick events of the button that change the active sheet
    // to create or hide the "reveal hidden columns" button.
    var captureTabChanges = function() {
        var noSheets = formulaCache.length;
        for (var i = 0; i < noSheets; ++i) {
            var btn = document.getElementById("tabstrip-link-" + i);
            if (typeof btn === "undefined" || btn === null) {
                break;
            }
            var old_onclick = btn.onclick;
            sheet_name = "sheet" + pad(i + 1, 3);
            var on_click = function(sheet_name) {
                // Inner function, to capture the sheet_name from the outer
                // arg. Can't simply capture it from the outer scope, as JS
                // scopes are function level, not block level, so we'd always
                // be capturing the old_onclick from the last iteration.
                return function() {
                    on_tab_click(sheet_name);
                    maybeAddRevealHiddenColumnsButton();
                }
            }(sheet_name);
            btn.onclick = on_click;
        }
    }

    var readFormulas = function(contentDocument) {
        // Read the xls metadata.
        var metas = contentDocument.head.getElementsByTagName('meta');
        for (var mi = metas.length - 1; mi >=0; --mi) {
            if (metas[mi].getAttribute("name") == "formula") {
                var formula = null;
                try {
                    formula = JSON.parse(metas[mi].getAttribute("content"));
                } catch (e) {
                    debugLog(e);
                }
                if (formula !== null) {
                    parseFormulas(formula);
                }
            }
        }
    }

    var verticalScroll = function(scrollDistance) {
      $viewerContainer = $j("#wrapper");
      $viewerContainer.animate({scrollTop: $viewerContainer.scrollTop() + scrollDistance}, 50);
    }

    var horizontalScroll = function(scrollDistance) {
      $viewerContainer = $j("#wrapper");
      $viewerContainer.animate({scrollLeft: $viewerContainer.scrollLeft() + scrollDistance}, 50);
    }

    // Init javascript around interacting with the document and start
    // polling for document changes.
    searchRoot = function() {
        // The div with the cells, in the child iframe.
        var wrapper = document.getElementById('wrapper');
        readFormulas(document);
        ensureHiddenIframeStyle(document);
        captureTabChanges();
        maybeAddRevealHiddenColumnsButton();

        var highlightS = document.createElement("style");
        highlightS.innerHTML = highlightStyle;
        document.body.insertBefore(highlightS, document.body.firstChild);
        if (edit_mode) wrapper.addEventListener("click", openEditDialog);
        wrapper.addEventListener("mousemove", function(evt){
                displayCoordinatesHandler(coordinateMarkers[1],coordinateMarkers[2])(evt);
                if (edit_mode) expediteScheduledCommits();
            });

        // Create fullscren "close-x"
        $closeX = $j('<div id="close-x"><div id="close-x-icon"></div></div>');
        $closeX.click($j.proxy(function () {
            $j("body").removeClass("fullscreen");
            this.frameMessenger.postMessageToParent("exit-parent-fullscreen");
        }, this));
        $j("body").prepend($closeX);

        // Initialize communication with parent frame
        frameMessenger = new FrameMessenger();
        frameMessenger.configureParentMessaging(
            trustedMessageFromParentHandler,
            ["listening_sfj", "notify_sfj", "print", "enter-fullscreen", "exit-viewer-fullscreen",
             "zoom-in", "zoom-out", "clear-mouse-tracking", "scroll-down", "scroll-up",
             "scroll-left", "scroll-right", "screen-down", "screen-up",
             "keydown-keys-handled-by-parent"]
            );
        frameMessenger.startListening();
        frameMessenger.postMessageToParent("get-keydown-keys-handled-by-parent");
        frameMessenger.postMessageToParent('viewer-ready');

        if (!startedPolling && poll_for_changes) {
            startedPolling = true;
            currentPoll = setTimeout(poll, versionPollTimeout);
            frameMessenger.postMessageToParent("loaded");
        }
        // TODO(mike): Have some way of noting web without pages
        frameMessenger.postMessageToParent("page-change", {
            current_page: 1,
            pages_count: 1,
            doc_type: "spreadsheet"
        });

        // Listen for keyboard shortcuts
        window.addEventListener('keydown', function keydown(evt) {
          // Keys inside an input are for editing, not keyboard shortcuts
          if (evt.target.tagName.toLowerCase() === "input") {
            return;
          }

          // TODO(mike): Once KeyboardEvent.key is implemented on all major browsers, we should switch
          // to that. .keyCode is deprecated, but it is the only property supported across all browsers.
          var keycodeStr = evt.keyCode.toString()
          if (Object.keys(keydownKeysHandledByParent).indexOf(keycodeStr) >= 0 &&
              !(evt.metaKey && !keydownKeysHandledByParent[keycodeStr].metaKey) &&
              !(evt.ctrlKey && !keydownKeysHandledByParent[keycodeStr].ctrlKey) &&
              !(evt.altKey  && !keydownKeysHandledByParent[keycodeStr].altKey)) {
            frameMessenger.postMessageToParent("keydown", {
              keyCode: evt.keyCode,
              ctrlKey: evt.ctrlKey,
              altKey: evt.altKey,
              metaKey: evt.metaKey,
              shiftKey: evt.shiftKey
            });
            evt.preventDefault();
          }
        });

        // Track mouse movements
        window.addEventListener('mousemove', function onMousemove(evt) {
          if (_mousemoveTimeout !== null) {
            // The mouse was moving before, restart the clock
            clearTimeout(_mousemoveTimeout);
            _mousemoveTimeout = null;
          } else {
            // The mouse recently started moving, report to parent
            frameMessenger.postMessageToParent("active-mouse");
          }
          _mousemoveTimeout = setTimeout(function onIdleMouse() {
            frameMessenger.postMessageToParent("idle-mouse");
            _mousemoveTimeout = null;
          }, 1500);
        });
    };

    var startedPolling = false;
    var stopPolling = false;
    var currentPoll = null;
    var versionPollTimeout=2500;
    var poll = function() {
        // HAX(mike): Disable automatic reloading on changed file
        return;

        debugLog("Poll...");
        var xhr = new XMLHttpRequest();
        xhr.open("GET", getCallbackUrl('doc_version/0'));
        xhr.onreadystatechange = function() {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    data = JSON.parse(this.responseText);
                    debugLog('Poll got sjid: ' + data['sjid'] + ' current sjid: ' + g_cur_sjid);
                    if (data['nsid'] != g_cur_nsid || data['sjid'] > g_cur_sjid) {
                        greatestKnownNsid = data['nsid'];
                        greatestKnownSjid = data['sjid'];
                        if (edit_mode) {
                            doCommit();
                        } else {
                            refreshDoc();
                        }
                    }
                }
                if (!stopPolling) {
                    currentPoll = setTimeout(poll, versionPollTimeout);
                }
            }
        };
        xhr.send();
    }

    var _isIE = function() {
        return window.navigator.userAgent.indexOf("MSIE ") > 0;
    }

    var _printSheet = function() {
        $j("body").addClass("printing");
        window.focus();
        if (_isIE()) {
            // IE has a special command for printing (otherwise it'll print the underlying frame)
            document.execCommand('print', false, null);
        } else {
            window.print();
        }
        $j("body").removeClass("printing");
    }

    var trustedMessageFromParentHandler = function(messageJson){
        switch (messageJson.action) {
            case "listening_sfj":
            case "notify_sfj":
                debugLog("Doing a mandatory poll because " + JSON.stringify(messageJson));
                poll();
                clearTimeout(currentPoll);
                currentPoll = null;
                stopPolling = true;
                break;
            case "enter-fullscreen":
                $j("body").addClass("fullscreen");
                break;
            case "exit-viewer-fullscreen":
                $j("body").removeClass("fullscreen");
                break;
            case "print":
                _printSheet();
                break;
            case "zoom-in":
                _zoomIn();
                break;
            case "zoom-out":
                _zoomOut();
                break;
            case "clear-mouse-tracking":
                clearTimeout(_mousemoveTimeout);
                _mousemoveTimeout = null;
                break;
            case "scroll-down":
                verticalScroll(100);
                break;
            case "scroll-up":
                verticalScroll(-100);
                break;
            case "scroll-left":
                horizontalScroll(-100);
                break;
            case "scroll-right":
                horizontalScroll(100);
                break;
            case "screen-down":
                verticalScroll($j("body").height());
                break;
            case "screen-up":
                verticalScroll(- $j("body").height());
                break;
            case "keydown-keys-handled-by-parent":
                keydownKeysHandledByParent = messageJson.parameters.keycodes;
                break;
        }
    };

    var _setZoomLevel = function (requestedZoomLevel) {
        _zoomLevel = Math.max(0, Math.min(_ZOOM_SCALES.length - 1, requestedZoomLevel));
        transformValue = "scale(" + _ZOOM_SCALES[_zoomLevel] + ")";
        $j(".sheet-content").css({
            "-webkit-transform": transformValue,
            "-ms-transform": transformValue,
            "-moz-transform": transformValue,
            "transform": transformValue,
            "-webkit-transform-origin": "top left",
            "-moz-transform-origin": "top left",
            "-ms-transform-origin": "top left",
            "-o-transform-origin": "top left",
            "transform-origin": "top left"
        });
    }

    var _zoomIn = function () {
        _setZoomLevel(_zoomLevel + 1);
    }

    var _zoomOut = function () {
        _setZoomLevel(_zoomLevel - 1);
    }

    /**
     * This is the callback when the invisible iframe has completed streaming in.
     */
    var applyNewFrame = function(iframeDownloaded) {
        var metas = iframeDownloaded.contentDocument.head.getElementsByTagName('meta');
        var nsid = g_cur_nsid;
        var sjid = g_cur_sjid;
        var newFormula = null;
        for (var mi = metas.length - 1; mi >=0; --mi) {
            if (metas[mi].getAttribute("name") == "nsid") {
                nsid = parseInt(metas[mi].getAttribute("content"));
            }
            if (metas[mi].getAttribute("name") == "sjid") {
                sjid = parseInt(metas[mi].getAttribute("content"));
            }
            if (metas[mi].getAttribute("name") == "formula") {
                try {
                    newFormula = JSON.parse(metas[mi].getAttribute("content"));
                } catch (e) {
                    debugLog(e);
                }
            }
        }
        var wrapper = document.getElementById("wrapper");
        var wrapperNew = iframeDownloaded.contentDocument.getElementById("wrapper");
        var tabStrip = document.getElementById("tabstrip");
        var tabStripNew = iframeDownloaded.contentDocument.getElementById("tabstrip");
        if (!(wrapper && wrapperNew && tabStrip && tabStripNew)) {
            iframeDownloaded.parentNode.removeChild(iframeDownloaded);
            return;
        }

        debugLog("pushing to frame");
        var activeSheet = getActiveSheet();
        var scrollX = wrapper.scrollLeft;
        var scrollY = wrapper.scrollTop;
        removeAllChildren(tabStrip);
        var tabStripChild;
        while ((tabStripChild = tabStripNew.firstChild) !== null) {
            tabStripNew.removeChild(tabStripChild);
            tabStrip.appendChild(tabStripChild);
        }
        var wrapperChildren = wrapper.children;
        var index;
        for (index = wrapperChildren.length - 1; index >= 0; --index) {
            wrapperChildren[index].parentNode.removeChild(wrapperChildren[index])
        }
        var wrapperChildrenNew = wrapperNew.children;
        for (index = wrapperChildrenNew.length - 1; index >= 0; --index) {
            var childDiv = wrapperChildrenNew[index];
            wrapperChildrenNew[index].parentNode.removeChild(childDiv)
            wrapper.insertBefore(childDiv, wrapper.firstChild);
        }
        var headChildrenNew = iframeDownloaded.contentDocument.head.children;
        var head = document.head;
        var headChildren = document.head.children;
        for (index = headChildren.length - 1; index >= 0; --index) {
            var child = headChildren[index];
            if (child.tagName && child.tagName.toLowerCase() !== "script") {
                headChildren[index].parentNode.removeChild(headChildren[index])
            }
        }
        for (index = headChildrenNew.length - 1; index >= 0; --index) {
            var childDiv = headChildrenNew[index];
            headChildrenNew[index].parentNode.removeChild(childDiv)
            head.insertBefore(childDiv, head.firstChild);
        }

        on_tab_click(getSheetIdName(activeSheet));
        searchRoot();
        wrapper.scrollLeft = scrollX;
        wrapper.scrollTop = scrollY;
        iframeDownloaded.parentNode.removeChild(iframeDownloaded);
    };


    var refreshDoc = function() {
        // Get the raw converted doc, no javascript.
        var url = getCallbackUrl("xls/raw/0");
        var formDryRun = document.createElement("form");
        formDryRun.style.display = "none";
        formDryRun.method = "post";
        formDryRun.action = url + "&dryrun=true";
        var iframeName = "iframeCounterunter_" + iframeCounter ++ ;
        formDryRun.target = iframeName;
        var iframeNew = document.createElement("iframe");
        iframeNew.style.display = "none";
        iframeNew.name = iframeName;
        var onLoad = function() {
            applyNewFrame(iframeNew);
        }
        document.body.appendChild(iframeNew);
        document.body.appendChild(formDryRun);
        iframeNew.onload = onLoad;
        formDryRun.submit();
        iframeNew.contentDocument.onload = onLoad;
        formDryRun.parentNode.removeChild(formDryRun);
    };

    /*
     * Main
     */
    searchRoot();
}());

