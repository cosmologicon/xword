// Generate the JSON data structures for the requests used to populate and format the spreadsheet.

// Main reference:
// https://developers.google.com/sheets/api/guides/batchupdate

"use strict"

let reqdata = {

	// Empty columns to the left of the grid
	marginleft: 1,
	// Empty columns between the grid and the clues
	margincenter: 1,
	// Empty columns to the right of the clues
	marginright: 1,

	// Empty rows above and below the grid/clues
	margintop: 4,
	marginbottom: 12,

	// Cell formatting for cells that don't follow the default formatting
	formats: {
		// Empty cells in the crossword grid: horizontally and vertically centered
		gridcell: {
			textFormat: {
				fontFamily: "Consolas",
			},
			horizontalAlignment: "CENTER",
			verticalAlignment: "MIDDLE",
		},
		// Shaded (blocked) cells
		blockcell: {
			textFormat: {
				fontFamily: "Consolas",
			},
			horizontalAlignment: "CENTER",
			verticalAlignment: "MIDDLE",
			backgroundColor: {
				red: 0.4,
				green: 0.4,
				blue: 0.4,
				alpha: 1,
			},
		},
		// Centered info cells: horizontally centered
		infocenter: {
			textFormat: {
				fontFamily: "Consolas",
			},
			horizontalAlignment: "CENTER",
		},
		// Left-aligned info cells
		infoleft: {
			textFormat: {
				fontFamily: "Consolas",
			},
		},
		// Solved clues
		solved: {
			textFormat: {
				foregroundColor: {
					red: 0.6,
					green: 0.6,
					blue: 0.6,
					alpha: 1,
				},
			},
		},
	},

	sheetproperties: function (grid) {
		// 8 columns for the clues
		let width = 8 + this.marginleft + this.margincenter + this.marginright + grid.width
		// Extra 1 for the ACROSS/DOWN header
		let naclues = Object.keys(grid.astarts).length + 1
		let ndclues = Object.keys(grid.dstarts).length + 1
		let height = Math.max(grid.height, naclues + ndclues) + this.margintop + this.marginbottom
		return {
			gridProperties: {
				rowCount: height,
				columnCount: width,
			},
		}
	},
	
	get: function (sheetid, grid) {
		return [].concat(
			this.widthreqs(sheetid, grid),
			[this.celldatareq(sheetid, grid)],
			this.cluereqs(sheetid, grid)
		)
	},

	// Resize the column widths.
	widthreqs: function (sheetid, grid) {
		let jcolumn = 0
		function req(width, ncolumns) {
			let ret = {
				updateDimensionProperties: {
					range: {
						sheetId: sheetid,
						dimension: "COLUMNS",
						startIndex: jcolumn,
						endIndex: jcolumn + ncolumns,
					},
					properties: {
						pixelSize: width,
					},
					fields: "*",
				},
			}
			jcolumn += ncolumns
			return ret
		}
		return [
			req(40, this.marginleft),  // Left of the grid
			req(22, grid.width),  // The grid itself
			req(40, this.margincenter),  // Between the grid and the clues
			req(50, 1),  // Clue number
			req(40, 1),  // Answer starting cell
			req(12, 1),  // Highlight box
			req(400, 1),  // Clue itself
			req(32, 1),  // Answer length
			req(150, 1),  // Partial answer
			req(80, 1),  // OneLook lookup link
			req(80, 1),  // nutrimatic lookup link
		]
	},

	updatereq: function (sheetid, rows, x0, y0) {
		return {
			updateCells: {
				rows: rows,
				fields: "*",
				start: {
					sheetId: sheetid,
					rowIndex: y0,
					columnIndex: x0,
				},
			},
		}
	},
	celldatareq: function (sheetid, grid) {
		let rows = []
		for (let y = 0 ; y < grid.height ; ++y) {
			let row = []
			for (let x = 0 ; x < grid.width ; ++x) {
				let format = grid.blocks[[x,y]] ? this.formats.blockcell : this.formats.gridcell
				row.push({
					userEnteredFormat: format,
				})
			}
			rows.push({ values: row })
		}
		return this.updatereq(sheetid, rows, this.marginleft, this.margintop)
	},

	// Requests to fill in the clue rows
	cluereqs: function (sheetid, grid) {
		let cellname = (cell, fixcol, fixrow) => {
			let [x, y] = cell
			let col = String.fromCharCode(65 + x % 26)
			x = Math.floor(x / 26)
			if (x) col = String.fromCharCode(64 + x) + col
			let row = "" + (1 + y)
			return (fixcol ? "$" : "") + col + (fixrow ? "$" : "") + row
		}
		// The values and formats for a clue row
		let cluerow = (cell0, cluenumber, answercell0, answerlen) => {
			let [x0, y0] = cell0
			// Cell containing the starting cell of the answer
			let startpointer = cellname([x0 + 1, y0])
			// Cell containing the clue
			let cluepointer = cellname([x0 + 3, y0])
			// Cell containing the length of the answer
			let lengthpointer = cellname([x0 + 4, y0])
			// Cell containing the partial answer
			let partialpointer = cellname([x0 + 5, y0])
			// The cells containing the answer
			let answercells = `OFFSET(INDIRECT(${startpointer}),0,0,1,${lengthpointer})`
			let partialformula = `=CONCATENATE(ARRAYFORMULA(IF(${answercells}="","?",${answercells})))`
			let [ax, ay] = answercell0
			answercell0 = [ax + this.marginleft, ay + this.margintop]
			// URL of the OneLook hyperlink
			let onelookurl = [
				'"https://www.onelook.com/thesaurus/?s="',
				partialpointer,
				'":"',
				cluepointer,
			].join("&")
			// URL of the nutrimatic hyperlink
			let nutrimaticurl = [
				'"https://nutrimatic.org/?q="',
				`SUBSTITUTE(LOWER(${partialpointer}),"?","A")`
			].join("&")
			return {
				values: [{
					// The clue number
					userEnteredValue: {
						stringValue: cluenumber,
					},
					userEnteredFormat: this.formats.infocenter,
				}, {
					// The answer starting cell
					userEnteredValue: {
						stringValue: cellname(answercell0),
					},
					userEnteredFormat: this.formats.infocenter,
				}, {
					// The highlight indicator cell
					userEnteredFormat: this.formats.infocenter,
				}, {
					// The clue cell
				}, {
					// Answer length
					userEnteredValue: {
						numberValue: answerlen,
					},
					userEnteredFormat: this.formats.infocenter,
				}, {
					// Partial answer
					userEnteredValue: {
						formulaValue: partialformula,
					},
					userEnteredFormat: this.formats.infoleft,
				}, {
					// OneLook hyperlink
					userEnteredValue: {
						formulaValue: `=HYPERLINK(${onelookurl},"OneLook")`
					},
				}, {
					// nutrimatic hyperlink
					userEnteredValue: {
						formulaValue: `=HYPERLINK(${nutrimaticurl},"nutrimatic")`
					},
				}],
			}
		}
		// The formatting rule that fades solved clues
		let formatreq = (x0, y0) => {
			let condition = `=NOT(ISTEXT(REGEXEXTRACT(${cellname([x0 + 5, y0])},"\\\?")))`
			return {
				addConditionalFormatRule: {
					rule: {
						ranges: [{
							sheetId: sheetid,
							startRowIndex: y0,
							endRowIndex: y0 + 1,
							startColumnIndex: x0,
							endColumnIndex: x0 + 5,
						}],
						booleanRule: {
							condition: {
								type: "CUSTOM_FORMULA",
								values: [{
									userEnteredValue: condition,
								}],
							},
							format: this.formats.solved,
						},
					},
					index: 0,
				},
			}
		}
		let x = this.marginleft + grid.width + this.margincenter
		let y = this.margintop
		let formatreqs = []
		// Build across clue content
		let acluestart = y
		y += 1
		let arows = []
		for (let jclue = 1 ; grid.cluestarts[jclue] ; ++jclue) {
			let cstart = grid.cluestarts[jclue]
			if (!grid.astarts[cstart]) continue  // Down only
			arows.push(cluerow([x, y], jclue + "A", cstart, grid.alens[cstart]))
			formatreqs.push(formatreq(x, y))
			y += 1
		}
		// Build down clue content
		let dcluestart = y
		y += 1
		let drows = []
		for (let jclue = 1 ; grid.cluestarts[jclue] ; ++jclue) {
			let cstart = grid.cluestarts[jclue]
			if (!grid.dstarts[cstart]) continue  // Across only
			drows.push(cluerow([x, y], jclue + "D", cstart, grid.dlens[cstart]))
			formatreqs.push(formatreq(x, y))
			y += 1
		}
		return [
			this.updatereq(sheetid, arows, x, acluestart + 1),
			this.updatereq(sheetid, drows, x, dcluestart + 1),
		].concat(formatreqs)
	},
}

