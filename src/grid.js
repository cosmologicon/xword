// Object to represent the layout of the grid

// Options:
// minlen: minimum word length
// symmetry: one of null, "C2"

// Cells are numbered column-first starting at [0, 0] in the upper-left.
// Entries are numbered as the clues are numbered in a crossword, starting at 1.

"use strict"

function Grid(width, height, opts) {
	this.width = width
	this.height = height
	this.set(opts || {})
	this.blocks = {}
	this.bars = {}
	this.update()
}
Grid.prototype = {
	optnames: ["minlen", "symmetry"],
	set: function (opts) {
		for (let optname of this.optnames) {
			if (optname in opts) {
				this[optname] = opts[optname]
			}
		}
	},
	// All cells in the set of symmetric cells for the given cell.
	scells: function (cell) {
		let cells = [cell]
		let [x, y] = cell
		if (this.symmetry === null) {
		} else if (this.symmetry == "C2") {
			cells.push([this.width - 1 - x, this.height - 1 - y])
		}
		cells.sort(this.cellsortkey)
		return cells.filter((cell, jcell) => cells.indexOf(cell) == jcell)
	},
	cellsortkey: function (cell0, cell1) {
		let [x0, y0] = cell0, [x1, y1] = cell1
		return y0 == y1 ? x0 - x1 : y0 - y1
	},

	allcells: function () {
		let cells = []
		for (let y = 0 ; y < this.height ; ++y) {
			for (let x = 0 ; x < this.width ; ++x) {
				cells.push([x, y])
			}
		}
		return cells
	},
	// Determine the locations and lengths of each clue based on the blocks and bars.
	update: function () {
		let cells = this.allcells()
		let empty = {}
		for (let cell of cells) {
			if (!this.blocks[cell]) empty[cell] = 1
		}
		// Returns true if both cells are empty and there's no bar between them. i.e. a word could
		// go between them.
		let openadj = (cell0, cell1) => empty[cell0] && empty[cell1] && !this.bars[[cell0, cell1]]
		// Length of an across/down clue starting at this cell.
		let alen = (cell) => {
			let nextcell = [cell[0] + 1, cell[1]]
			return 1 + (openadj(cell, nextcell) ? alen(nextcell) : 0)
		}
		let dlen = (cell) => {
			let nextcell = [cell[0], cell[1] + 1]
			return 1 + (openadj(cell, nextcell) ? dlen(nextcell) : 0)
		}
		// All cells that begin a word and their corresponding lengths
		this.cluestarts = {}
		this.astarts = {}
		this.dstarts = {}
		this.alens = {}
		this.dlens = {}
		let jclue = 1
		for (let cell of cells) {
			if (!empty[cell]) continue
			let [x, y] = cell
			let isclue = false
			if (!openadj([x - 1, y], cell) && alen(cell) >= this.minlen) {
				this.astarts[cell] = jclue
				this.alens[cell] = alen(cell)
				isclue = true
			}
			if (!openadj([x, y - 1], cell) && dlen(cell) >= this.minlen) {
				this.dstarts[cell] = jclue
				this.dlens[cell] = dlen(cell)
				isclue = true
			}
			if (isclue) {
				this.cluestarts[jclue++] = cell
			}
		}
		this.maxclue = jclue - 1
	},
	setblocks: function (cells, value) {
		for (let cell of cells) {
			if (value) {
				this.blocks[cell] = value
			} else {
				delete this.blocks[cell]
			}
		}
		this.update()
	},
}
let grid = null
