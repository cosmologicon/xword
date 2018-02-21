"use strict"

let draw = {
	init: function () {
		this.canvas = document.getElementById("canvas")
		this.canvas.width = this.canvas.height = 700
		this.context = this.canvas.getContext("2d")
		UFX.draw.setcontext(this.context)
		UFX.pointer(this.canvas)
		UFX.draw("fs #ccc f0")
	},
	draw: function (grid, cursor) {
		cursor = cursor || { blocks: [], bars: [], }
		let n = 2 + Math.max(grid.width, grid.height)
		let z = this.canvas.width / n
		UFX.draw("fs #ccc f0 [ t", this.canvas.width / 2, this. canvas.height / 2, "z", z, z,
			"t", -grid.width / 2, -grid.height / 2)
		// Grid lines
		UFX.draw("ss #aaa linecap round lw 0.02")
		for (let y = 0 ; y <= grid.height ; ++y) {
			UFX.draw("b m 0", y, "l", grid.width, y, "s")
		}
		for (let x = 0 ; x <= grid.width ; ++x) {
			UFX.draw("b m", x, "0 l", x, grid.height, "s")
		}
		// Blocks
		for (let block in grid.blocks) {
			if (cursor.blocks.includes("" + block)) continue
			UFX.draw("[ t", block.replace(","," "), "fs #444 fr 0 0 1 1 ]")
		}
		for (let block of cursor.blocks) {
			let color = grid.blocks[block] ? "#666" : "#aaa"
			UFX.draw("[ t", block, "fs", color, "fr 0 0 1 1 ]")
		}
		// Bars
		for (let bar in grid.bars) {
			if (cursor.bars.includes("" + bar)) continue
			let [x0, y0, x1, y1] = bar.split(",")
			UFX.draw("[ b m", +x1, +y1, "l", +x0+1, +y0+1, "ss #444 lw 0.1 s ]")
		}
		for (let bar of cursor.bars) {
			let color = grid.bars[bar] ? "#666" : "#aaa"
			let [[x0, y0], [x1, y1]] = bar
			UFX.draw("[ b m", +x1, +y1, "l", +x0+1, +y0+1, "ss", color, "lw 0.1 s ]")
		}
		// Grid outline
		UFX.draw("[ ss black lw 0.05 sr 0 0", grid.width, grid.height, "]")
		// Cell numbers
		for (let jclue in grid.cluestarts) {
			UFX.draw(
				"[ t", grid.cluestarts[jclue], "z", 0.01, 0.01,
				"font 40px~'sans-serif' tab left top fs black ft", jclue, 5, 5,
				"]")
		}
		UFX.draw("]")
	},
	gridpos: function (pos, grid) {
		let [x, y] = pos
		let n = 2 + Math.max(grid.width, grid.height)
		x = (x / this.canvas.width - 0.5) * n + grid.width / 2
		y = (y / this.canvas.height - 0.5) * n + grid.height / 2
		return [x, y]
	},
}
