// const form = document.getElementById("settings") as HTMLFormElement
// const form = document.querySelector<HTMLFormElement>("#settings")

const button_start = document.getElementById("start") as HTMLButtonElement;
button_start.addEventListener("click", (_e) => {
    maze.reload();
    if ((document.getElementById("dfs") as HTMLInputElement).checked) dfs();
    if ((document.getElementById("bfs") as HTMLInputElement).checked) bfs();
    if ((document.getElementById("dij") as HTMLInputElement).checked) dijkstra();
    if ((document.getElementById("a*") as HTMLInputElement).checked) astar();
});
const button_regenerate = document.getElementById("regenerate") as HTMLButtonElement;
button_regenerate.addEventListener("click", (_e) => {
    maze.regenerate();
    canvas_refresh();
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
    reload() {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.maze[i][j] == MazeCell.ACTIVE || this.maze[i][j] == MazeCell.EXPLORED)
                    this.set_cell_type({ x: i, y: j }, MazeCell.FLOOR);
            }
        }
    }
}

const maze = new Maze(40, 20);

const solving_step_delay = 100;
const drawing_solution_step_delay = 50;
const canvas = document.getElementById("maze_canvas") as HTMLCanvasElement;
const cell_width = canvas.width / maze.width;
const cell_height = canvas.height / maze.height;
const ctx = canvas.getContext("2d");
function canvas_refresh() {
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

function canvas_draw_path(path_cell: searched_cell) {
    if (path_cell.prev_cell != null) path_cell = path_cell.prev_cell;
    if (ctx == undefined) return;
    ctx.fillStyle = "purple";
    function step() {
        if (path_cell.prev_cell == null) {
            clearInterval(interval_code);
            return;
        }
        ctx?.fillRect(path_cell.coord.x * cell_width, path_cell.coord.y * cell_height, cell_width, cell_height);
        path_cell = path_cell.prev_cell;
    }
    const interval_code = setInterval(step, drawing_solution_step_delay);
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

    function step() {
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

        if (search_ended) {
            if (final_searched_cell != null) {
                canvas_draw_path(final_searched_cell);
                console.log("Found end");
            } else {
                console.log("Could not find end");
            }
            clearInterval(interval_code);
        }
    }
    const interval_code = setInterval(step, solving_step_delay);
}
function astar() {
    canvas_refresh();
}
function dijkstra() {
    canvas_refresh();
}

canvas_refresh();
