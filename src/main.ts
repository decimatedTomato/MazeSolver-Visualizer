// const form = document.getElementById("settings") as HTMLFormElement
// const form = document.querySelector<HTMLFormElement>("#settings")

const button = document.getElementById("start") as HTMLButtonElement;
button.addEventListener("click", (e) => {
    if ((document.getElementById("dfs") as HTMLInputElement).checked) dfs();
    if ((document.getElementById("bfs") as HTMLInputElement).checked) bfs();
    if ((document.getElementById("dij") as HTMLInputElement).checked) dijkstra();
    if ((document.getElementById("a*") as HTMLInputElement).checked) astar();
});

enum MazeCell {
    FLOOR,
    WALL,
    ACTIVE,
    EXPLORED,
}
type Coordinate = {
    x: number;
    y: number;
};
function coordinate_equals(coord1: Coordinate | null, coord2: Coordinate | null) {
    return coord1?.x == coord2?.x && coord1?.y == coord2?.y;
}
function coordinate_random(x: number, y: number): Coordinate {
    return {
        x: Math.floor(Math.random() * x),
        y: Math.floor(Math.random() * y),
    };
}
type searched_cell = {
    coord: Coordinate;
    prev_cell: searched_cell | null;
};
class Maze {
    readonly height: number;
    readonly width: number;
    readonly floor_likelihood = 0.6;
    readonly maze: MazeCell[][] = [];
    start: Coordinate | null;
    end: Coordinate | null;

    constructor(width: number, height: number) {
        this.height = height;
        this.width = width;
        this.start = null;
        this.end = null;
        this.regenerate();
    }
    public get_cell_type(coordinate: Coordinate) {
        return this.maze[coordinate.x][coordinate.y];
    }
    public set_cell_type(coordinate: Coordinate, cell_type: MazeCell) {
        this.maze[coordinate.x][coordinate.y] = cell_type;
    }
    public get_neighboring_coordinates(coordinate: Coordinate) {
        const neighbors = [];
        if (coordinate.x + 1 <= this.width - 1) neighbors.push({ x: coordinate.x + 1, y: coordinate.y });
        if (coordinate.y + 1 <= this.width - 1) neighbors.push({ x: coordinate.x, y: coordinate.y + 1 });
        if (coordinate.x - 1 >= 0) neighbors.push({ x: coordinate.x - 1, y: coordinate.y });
        if (coordinate.y - 1 >= 0) neighbors.push({ x: coordinate.x, y: coordinate.y - 1 });
        return neighbors;
    }
    public regenerate() {
        this.start = coordinate_random(this.width, this.height);
        this.end = coordinate_random(this.width, this.height);
        this.maze.length = 0;
        for (let i = 0; i < this.width; i++) {
            const column: MazeCell[] = [];
            for (let j = 0; j < this.height; j++) {
                let cell: MazeCell;
                if (Math.random() < this.floor_likelihood) {
                    cell = MazeCell.FLOOR;
                } else {
                    cell = MazeCell.WALL;
                }
                column.push(cell);
            }
            this.maze.push(column);
        }
        this.set_cell_type(this.start, MazeCell.EXPLORED);
        this.set_cell_type(this.end, MazeCell.FLOOR);
    }
}

const maze = new Maze(40, 20);
const canvas = document.getElementById("maze_canvas") as HTMLCanvasElement;
const cell_width = canvas.width / maze.width;
const cell_height = canvas.height / maze.height;
const ctx = canvas.getContext("2d");
function canvas_refresh() {
    function draw() {
        if (ctx == undefined) return;
        ctx.fillStyle = "black";
        ctx.fill();
        for (let i = 0; i < maze.width; i++) {
            for (let j = 0; j < maze.height; j++) {
                let color = "black";
                if (maze.maze[i][j] == MazeCell.FLOOR) color = "white";
                else if (maze.maze[i][j] == MazeCell.WALL) color = "black";
                else if (maze.maze[i][j] == MazeCell.ACTIVE) color = "yellow";
                else if (maze.maze[i][j] == MazeCell.EXPLORED) color = "gray";
                if (maze.start?.x == i && maze.start?.y == j) color = "green";
                if (maze.end?.x == i && maze.end?.y == j) color = "red";

                ctx.fillStyle = color;
                ctx.fillRect(i * cell_width, j * cell_height, cell_width, cell_height);
            }
        }
    }
    setTimeout(draw, 0);
}

function canvas_draw_path(path_cell: searched_cell) {
    if (path_cell.prev_cell != null) path_cell = path_cell.prev_cell;
    if (ctx == undefined) return;
    ctx.fillStyle = "purple";
    while (path_cell.prev_cell != null) {
        ctx.fillRect(path_cell.coord.x * cell_width, path_cell.coord.y * cell_height, cell_width, cell_height);
        path_cell = path_cell.prev_cell;
    }
}

function dfs() {
    canvas_refresh();
}
function bfs() {
    if (maze.start == null) return;
    let search_frontier: Array<searched_cell> = [{ coord: maze.start, prev_cell: null }];
    let next_search_frontier: Array<searched_cell> = [];

    let search_ended = false;
    let final_searched_cell: searched_cell | null = null;
    while (!search_ended) {
        for (const position of search_frontier) {
            maze.set_cell_type(position.coord, MazeCell.EXPLORED);
            for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                if (coordinate_equals(maze.end, adjacent_position)) {
                    final_searched_cell = {
                        coord: adjacent_position,
                        prev_cell: position,
                    };
                    break;
                } else if (maze.get_cell_type(adjacent_position) == MazeCell.FLOOR) {
                    maze.set_cell_type(adjacent_position, MazeCell.ACTIVE);
                    next_search_frontier.push({
                        coord: adjacent_position,
                        prev_cell: position,
                    });
                }
            }
            if (final_searched_cell != null) {
                for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                    if (maze.get_cell_type(adjacent_position) == MazeCell.ACTIVE) maze.set_cell_type(adjacent_position, MazeCell.FLOOR);
                }
                break;
            }
        }
        search_frontier = next_search_frontier;
        next_search_frontier = [];
        if (final_searched_cell != null) search_ended = true;
        if (search_frontier.length == 0) search_ended = true;
        canvas_refresh();
    }
    if (final_searched_cell != null) {
        canvas_draw_path(final_searched_cell);
        console.log("Found end");
    } else {
        console.log("Could not find end")
    }
}
function astar() {
    canvas_refresh();
}
function dijkstra() {
    canvas_refresh();
}

canvas_refresh();
