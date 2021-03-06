// Object to represent the layout of the grid

// Options:
// minlen: minimum word length
// symmetry: one of null, "C2"
// editblocks: boolean
// editbars: boolean

// Cells are numbered column-first starting at [0, 0] in the upper-left.
// Entries are numbered as the clues are numbered in a crossword, starting at 1.

"use strict"

function Grid(width, height, opts) {
	this.width = width
	this.height = height
	this.blocks = {}
	this.bars = {}
	this.set(opts || {})
}
Grid.prototype = {
	optnames: ["minlen", "symmetry", "editblocks", "editbars"],
	set: function (opts) {
		for (let optname of this.optnames) {
			if (optname in opts) {
				this[optname] = opts[optname]
			}
		}
		this.update()
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
	sedges: function (edge) {
		let edges = [edge]
		let [[x0, y0], [x1, y1]] = edge
		if (this.symmetry === null) {
		} else if (this.symmetry == "C2") {
			edges.push([
				[this.width - 1 - x1, this.height - 1 - y1],
				[this.width - 1 - x0, this.height - 1 - y0],
			])
		}
		edges.sort(this.edgesortkey)
		return edges.filter((edge, jedge) => edges.indexOf(edge) == jedge)
	},
	cellsortkey: function (cell0, cell1) {
		let [x0, y0] = cell0, [x1, y1] = cell1
		return y0 == y1 ? x0 - x1 : y0 - y1
	},
	edgesortkey: function (edge0, edge1) {
		return grid.cellsortkey(edge0[0], edge1[0]) || grid.cellsortkey(edge0[1], edge1[1])
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
	ingrid: function (cell) {
		let [x, y] = cell
		return 0 <= x && x < this.width && 0 <= y && y < this.height
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
	setbars: function (edges, value) {
		for (let edge of edges) {
			if (value) {
				this.bars[edge] = value
			} else {
				delete this.bars[edge]
			}
		}
		this.update()
	},
	getcursor: function (pos) {
		let [x, y] = pos
		if (!(0 < x && x < grid.width && 0 < y && y < grid.height)) {
			return null
		}
		let cell0 = null, dcell = 0
		if (this.editblocks) {
			cell0 = [Math.floor(x), Math.floor(y)]
			let dx = x - (cell0[0] + 0.5), dy = y - (cell0[1] + 0.5)
			dcell = Math.sqrt(dx * dx + dy * dy)
		}
		let edge0 = null, dedge = 0
		if (this.editbars) {
			let ecell0 = [Math.floor(x), Math.floor(y)]
			let u = x % 1 + y % 1 > 1
			let v = x % 1 > y % 1
			let dx = u != v ? 0 : u ? 1 : -1
			let dy = u == v ? 0 : u ? 1 : -1
			let ecell1 = [ecell0[0] + dx, ecell0[1] + dy]
			if (this.ingrid(ecell1)) {
				edge0 = [ecell0, ecell1]
				edge0.sort(this.cellsortkey)
				let dex = x - (ecell0[0] + 0.5 + 0.5 * dx)
				let dey = y - (ecell0[1] + 0.5 + 0.5 * dy)
				dedge = Math.sqrt(dex * dex + dey * dey)
			}
		}
		if (cell0 && edge0) {
			if (dedge < dcell) cell0 = null
			else edge0 = null
		}
		let blocks = cell0 ? grid.scells(cell0) : []
		let bars = edge0 ? grid.sedges(edge0) : []
		let value = cell0 ? !this.blocks[cell0] : !this.bars[edge0]
		return {
			blocks: blocks,
			bars: bars,
			value: value,
		}
	},
	applycursor: function (cursor) {
		if (cursor.blocks.length) {
			this.setblocks(cursor.blocks, cursor.value)
		}
		if (cursor.bars.length) {
			this.setbars(cursor.bars, cursor.value)
		}
	},
}
let grid = null
