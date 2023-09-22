
// const form = document.getElementById("settings") as HTMLFormElement
// const form = document.querySelector<HTMLFormElement>("#settings")

const button = document.getElementById("start") as HTMLButtonElement
button.addEventListener("click", (_e) => {
    console.log("Pressed")
    if (document.getElementById("dfs")) dfs()
    if (document.getElementById("bfs")) bfs()
    if (document.getElementById("dij")) dijkstra()
    if (document.getElementById("a*")) astar()
  })


enum MazeCell {
    FLOOR,
    WALL,
    ACTIVE,
    EXPLORED,
}
type Coordinate = {
    x: number
    y: number
}
function random_coordinate(x: number, y: number): Coordinate {
    return { x: Math.floor(Math.random() * x), y: Math.floor(Math.random() * y) }
}
class Maze {
    readonly height: number
    readonly width: number
    readonly floor_likelihood = 0.6
    readonly maze: MazeCell[][] = []
    start: Coordinate | null
    end: Coordinate | null
    
    constructor(width: number, height: number) {
        this.height = height
        this.width = width
        this.start = null
        this.end = null
        this.regenerate()
    }
    public regenerate() {
        this.start = random_coordinate(this.width, this.height)
        this.end = random_coordinate(this.width, this.height)
        this.maze.length = 0
        for (let i = 0; i < this.width; i++) {
            const column: MazeCell[] = []
            for (let j = 0; j < this.height; j++) {
                let cell: MazeCell
                if (Math.random() < this.floor_likelihood) {
                    cell = MazeCell.FLOOR
                } else {
                    cell = MazeCell.WALL
                }
                column.push(cell)
            }
            this.maze.push(column)
        }
    }
}

const maze = new Maze(40, 20)
const canvas = document.getElementById("maze_canvas") as HTMLCanvasElement
const cell_width = canvas.width / maze.width
const cell_height = canvas.height / maze.height
const ctx = canvas.getContext("2d")
function canvas_refresh() {
    if (ctx == undefined) return
    ctx.fillStyle = "black"
    ctx.fill()
    for (let i = 0; i < maze.width; i++) {
        for (let j = 0; j < maze.height; j++) {
            let color = "black"
            if (maze.maze[i][j] == MazeCell.FLOOR) color = "white"
            else if (maze.maze[i][j] == MazeCell.WALL) color = "black"
            else if (maze.maze[i][j] == MazeCell.ACTIVE) color = "yellow"
            else if (maze.maze[i][j] == MazeCell.EXPLORED) color = "gray"
            if (maze.start?.x == i && maze.start?.y == j) color = "green"
            if (maze.end?.x == i && maze.end?.y == j) color = "red"

            ctx.fillStyle = color
            ctx.fillRect(i * cell_width, j * cell_height, cell_width, cell_height)
        }
    }
}

function dfs() {
    canvas_refresh()
}
function bfs() {
    canvas_refresh()
}
function astar() {
    canvas_refresh()
}
function dijkstra() {
    canvas_refresh()
}

canvas_refresh()