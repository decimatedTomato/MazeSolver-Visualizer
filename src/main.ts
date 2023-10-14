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
function manhattan_distance(coord1: Coordinate, coord2: Coordinate) {
    return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y);
}
function euclidean_distance(coord1: Coordinate, coord2: Coordinate) {
    return Math.sqrt((coord1.x - coord2.x) * (coord1.x - coord2.x) + (coord1.y - coord2.y) * (coord1.y - coord2.y));
}
function coordinate_frequency(coord: Coordinate) {
    return euclidean_distance(coord, { x: maze.width, y: maze.height });
}
function coordinate_equals(coord1: Coordinate | undefined, coord2: Coordinate | undefined) {
    return coord1?.x === coord2?.x && coord1?.y === coord2?.y;
}
function coordinate_random(x: number, y: number): Coordinate {
    return {
        x: Math.floor(Math.random() * x),
        y: Math.floor(Math.random() * y),
    };
}
type searched_cell = {
    coord: Coordinate;
    prev_cell: searched_cell | undefined;
};
class Maze {
    readonly height: number;
    readonly width: number;
    readonly floor_likelihood = 0.6;
    readonly maze: MazeCell[][] = [];
    start: Coordinate | undefined;
    end: Coordinate | undefined;

    constructor(config: MazeConfig) {
        this.height = config.grid_height;
        this.width = config.grid_width;
        this.start = undefined;
        this.end = undefined;
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
    public reload() {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                if (this.maze[i][j] == MazeCell.ACTIVE || this.maze[i][j] == MazeCell.EXPLORED)
                    this.set_cell_type({ x: i, y: j }, MazeCell.FLOOR);
            }
        }
    }
}
type MazeConfig = {
    grid_width: number;
    grid_height: number;
};
type VisualizationConfig = {
    is_paused: boolean;
    alg: MazeSolvingAlgorithm | undefined;
    max_delay: number;
    solve_step_speed: number;
    draw_delay: number;
    audio_config:
        | {
              audio_volume: number;
              audio_min_frequency: number;
              audio_range_frequency: number;
              audio_ctx: AudioContext;
              gain_node: GainNode;
          }
        | undefined;
};
function calculate_delay(config: VisualizationConfig) {
    return config.max_delay / config.solve_step_speed;
}
function normalize_audio(frequency: number, config: { audio_min_frequency: number; audio_range_frequency: number }) {
    if (config == undefined) return 0;
    frequency /= Math.sqrt(maze.width * maze.width + maze.height * maze.height);
    frequency *= config.audio_range_frequency;
    frequency += config.audio_min_frequency;
    return frequency;
}
abstract class MazeSolvingAlgorithm {
    readonly config: VisualizationConfig;
    readonly maze: Maze;

    search_ended: boolean = false;
    final_searched_cell: searched_cell | undefined = undefined;

    interval_code: number | undefined = undefined;

    constructor(visualization_config: VisualizationConfig, maze: Maze) {
        this.config = visualization_config;
        this.maze = maze;
    }
    /**
     * Progresses the algorithm solution by 1 step, modifying the maze and producing sound appropriately
     */
    protected abstract step(): void;
    
    /**
     * Begins drawing the maze solving steps until cancelled externally or the algorithm completes execution
     */
    public visualize(): void {
        this.config.is_paused = false;
        this.interval_code = setInterval(() => {
            if (this.config.alg !== undefined) this.config.alg.step.call(this); // Disturbing
        }, calculate_delay(this.config));
    }
    
    /**
     * Makes sure that the visualization interval is set to the most recent rate supplied by the user
     */
    public update_visualize_interval() {
        clearInterval(this.interval_code);
        this.interval_code = setInterval(() => {
            if (this.config.alg !== undefined) this.config.alg.step.call(this);
        }, calculate_delay(this.config));
    }

    protected playNote(frequency: number, duration: number) {
        if (this.config.audio_config === undefined || this.config.audio_config.gain_node === undefined) return;
        const oscillator = this.config.audio_config.audio_ctx.createOscillator();
        oscillator.type = "square";
        oscillator.connect(this.config.audio_config.gain_node);
        // this.config.audio_config.gain_node?.connect(oscillator);
        oscillator.frequency.value = normalize_audio(frequency, this.config.audio_config);
        oscillator.start();

        setTimeout(() => {
            oscillator.stop();
            // if (this.config.audio_config === undefined) return;
            // oscillator.disconnect(this.config.audio_config.audio_ctx.destination);
        }, duration / 2);
    }

    protected canvas_draw_path(path_cell: searched_cell) {
        if (path_cell.prev_cell !== undefined) path_cell = path_cell.prev_cell;
        if (ctx === null) return;
        ctx.fillStyle = "purple";
        const draw_step = () => {
            if (path_cell.prev_cell === undefined) {
                clearInterval(interval_draw);
                return;
            }
            ctx.fillRect(path_cell.coord.x * cell_width, path_cell.coord.y * cell_height, cell_width, cell_height);
            path_cell = path_cell.prev_cell;
            this.playNote(coordinate_frequency(path_cell.coord), this.config.draw_delay);
        };
        const interval_draw = setInterval(draw_step, this.config.draw_delay);
    }
}

function canvas_refresh(maze: Maze) {
    if (ctx === null) return;
    ctx.fillStyle = "black";
    ctx.fill();
    for (let i = 0; i < maze.width; i++) {
        for (let j = 0; j < maze.height; j++) {
            let color = "black";
            if (maze.maze[i][j] === MazeCell.FLOOR) color = "white";
            else if (maze.maze[i][j] === MazeCell.WALL) color = "black";
            else if (maze.maze[i][j] === MazeCell.ACTIVE) color = "yellow";
            else if (maze.maze[i][j] === MazeCell.EXPLORED) color = "gray";
            if (maze.start?.x === i && maze.start?.y === j) color = "green";
            if (maze.end?.x === i && maze.end?.y === j) color = "red";

            ctx.fillStyle = color;
            ctx.fillRect(i * cell_width, j * cell_height, cell_width, cell_height);
        }
    }
}

class BFS extends MazeSolvingAlgorithm {
    next_search_frontier: Array<searched_cell> = [];
    iterator = this.next_search_frontier.values();

    constructor(config: VisualizationConfig, maze: Maze) {
        super(config, maze);
        if (maze.start !== undefined) this.next_search_frontier = [{ coord: maze.start, prev_cell: undefined }];
    }

    protected step() {
        if (this.interval_code === undefined) return;
        if (config.is_paused) return;

        const next = this.iterator.next();
        let position: searched_cell = next.value;
        let done = next.done === true;

        if (done === true) {
            if (this.next_search_frontier.length === 0) this.search_ended = true;
            this.iterator = this.next_search_frontier.values();
            this.next_search_frontier = [];
            position = this.iterator.next().value;
        }
        if (!this.search_ended) {
            maze.set_cell_type(position.coord, MazeCell.EXPLORED);
            for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                if (coordinate_equals(maze.end, adjacent_position)) {
                    this.final_searched_cell = {
                        coord: adjacent_position,
                        prev_cell: position,
                    };
                    break;
                } else if (maze.get_cell_type(adjacent_position) === MazeCell.FLOOR) {
                    maze.set_cell_type(adjacent_position, MazeCell.ACTIVE);
                    this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
                    this.next_search_frontier.push({
                        coord: adjacent_position,
                        prev_cell: position,
                    });
                }
            }
            if (this.final_searched_cell !== undefined) {
                for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                    if (maze.get_cell_type(adjacent_position) === MazeCell.ACTIVE) maze.set_cell_type(adjacent_position, MazeCell.FLOOR);
                }
            }

            if (this.final_searched_cell !== undefined) this.search_ended = true;
            canvas_refresh(this.maze);
        } else {
            if (this.final_searched_cell !== undefined) {
                this.canvas_draw_path(this.final_searched_cell);
                console.log("Found end");
            } else {
                console.log("Could not find end");
            }
            clearInterval(this.interval_code);
        }
    }
}

type priority_queue_element = {
    priority: number;
    cell: searched_cell;
};
class GBFS extends MazeSolvingAlgorithm {
    search_frontier: Array<priority_queue_element> = [];

    constructor(config: VisualizationConfig, maze: Maze) {
        super(config, maze);
        if (maze.start !== undefined && maze.end !== undefined)
            this.search_frontier = [{ priority: manhattan_distance(maze.start, maze.end), cell: { coord: maze.start, prev_cell: undefined } }];
    }

    protected step() {
        if (maze.end === undefined || this.interval_code === undefined) return;
        if (config.is_paused) return;

        const frontier_element = this.search_frontier.shift();
        if (frontier_element === undefined) return;
        const position = frontier_element.cell;
        maze.set_cell_type(position.coord, MazeCell.EXPLORED);

        for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
            if (coordinate_equals(maze.end, adjacent_position)) {
                this.final_searched_cell = {
                    coord: adjacent_position,
                    prev_cell: position,
                };
                break;
            } else if (maze.get_cell_type(adjacent_position) === MazeCell.FLOOR) {
                maze.set_cell_type(adjacent_position, MazeCell.ACTIVE);
                this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
                const priority = manhattan_distance(adjacent_position, maze.end);
                let index_to_insert = 0;
                for (const element of this.search_frontier) {
                    if (element.priority > priority) break;
                    index_to_insert++;
                }
                this.search_frontier.splice(index_to_insert, 0, {
                    priority: priority,
                    cell: { coord: adjacent_position, prev_cell: position },
                });
            }
        }
        if (this.final_searched_cell !== undefined) {
            for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                if (maze.get_cell_type(adjacent_position) === MazeCell.ACTIVE) maze.set_cell_type(adjacent_position, MazeCell.FLOOR);
            }
        }
        if (this.final_searched_cell !== undefined) this.search_ended = true;
        if (this.search_frontier.length == 0) this.search_ended = true;
        canvas_refresh(this.maze);

        if (this.search_ended) {
            if (this.final_searched_cell !== undefined) {
                this.canvas_draw_path(this.final_searched_cell);
                console.log("Found end");
            } else {
                console.log("Could not find end");
            }
            clearInterval(this.interval_code);
        }
    }
}

class ASTAR extends MazeSolvingAlgorithm {
    search_frontier: Array<priority_queue_element> = [];

    constructor(config: VisualizationConfig, maze: Maze) {
        super(config, maze);
        if (maze.start === undefined || maze.end === undefined) return;
        this.search_frontier = [{ priority: manhattan_distance(maze.start, maze.end), cell: { coord: maze.start, prev_cell: undefined } }];
    }

    private astar_dist(coord: Coordinate) {
        if (maze.start === undefined || maze.end === undefined) return 0;
        return manhattan_distance(maze.start, coord) + manhattan_distance(maze.end, coord);
    }

    protected step() {
        if (maze.end === undefined || this.interval_code === undefined) return;
        if (config.is_paused) return;

        const frontier_element = this.search_frontier.shift();
        if (frontier_element === undefined) return;
        const position = frontier_element.cell;
        maze.set_cell_type(position.coord, MazeCell.EXPLORED);

        for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
            if (coordinate_equals(maze.end, adjacent_position)) {
                this.final_searched_cell = {
                    coord: adjacent_position,
                    prev_cell: position,
                };
                break;
            } else if (maze.get_cell_type(adjacent_position) === MazeCell.FLOOR) {
                maze.set_cell_type(adjacent_position, MazeCell.ACTIVE);
                this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
                const priority = this.astar_dist(adjacent_position);
                let index_to_insert = 0;
                for (const element of this.search_frontier) {
                    if (element.priority > priority) break;
                    index_to_insert++;
                }
                this.search_frontier.splice(index_to_insert, 0, {
                    priority: priority,
                    cell: { coord: adjacent_position, prev_cell: position },
                });
            }
        }
        if (this.final_searched_cell !== undefined) {
            for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
                if (maze.get_cell_type(adjacent_position) === MazeCell.ACTIVE) maze.set_cell_type(adjacent_position, MazeCell.FLOOR);
            }
        }
        if (this.final_searched_cell !== undefined) this.search_ended = true;
        if (this.search_frontier.length === 0) this.search_ended = true;
        canvas_refresh(this.maze);

        if (this.search_ended) {
            if (this.final_searched_cell !== undefined) {
                this.canvas_draw_path(this.final_searched_cell);
                console.log("Found end");
            } else {
                console.log("Could not find end");
            }
            clearInterval(this.interval_code);
        }
    }
}

// MAIN FUNCTION

const maze_config: MazeConfig = { grid_width: 40, grid_height: 20 };
let maze = new Maze(maze_config);

const canvas = document.getElementById("maze_canvas") as HTMLCanvasElement;
const cell_width = 15;
const cell_height = 15;
const ctx = canvas.getContext("2d");
const audio = document.createElement("AUDIO") as HTMLAudioElement;
const audio_context = new (window.AudioContext || window.AudioContext)();
const config: VisualizationConfig = {
    is_paused: true,
    alg: undefined,
    max_delay: 50,
    solve_step_speed: 0.5,
    draw_delay: 50,
    audio_config: {
        audio_volume: 50,
        audio_min_frequency: 200,
        audio_range_frequency: 100,
        audio_ctx: audio_context,
        gain_node: audio_context.createGain(),
    },
};
config.audio_config?.gain_node.gain.setValueAtTime(0.1, 0);
config.audio_config?.gain_node.connect(config.audio_config.audio_ctx.destination);

const button_start = document.getElementById("start") as HTMLButtonElement;
button_start.onclick = function() {
    // Unpause
    if (config.is_paused && config.alg !== undefined) {
        config.is_paused = false;
        return;
    }
    // Redo visualization
    if (config.alg !== undefined) {
        config.alg.search_ended = true;
        clearInterval(config.alg.interval_code);
        config.alg = undefined;
        maze.reload();
    }
    // Normal start
    if ((document.getElementById("bfs") as HTMLInputElement).checked) config.alg = new BFS(config, maze);
    if ((document.getElementById("gbfs") as HTMLInputElement).checked) config.alg = new GBFS(config, maze);
    if ((document.getElementById("a*") as HTMLInputElement).checked) config.alg = new ASTAR(config, maze);
    if (config.alg !== undefined) config.alg.visualize();
}
const button_stop = document.getElementById("stop") as HTMLInputElement;
button_stop.onclick = function() {
    config.is_paused = true;
}
const button_regenerate = document.getElementById("regenerate") as HTMLButtonElement;
button_regenerate.onclick = function () {
    // End the algorithm prematurely so that it can be garbage collected
    if (config.alg !== undefined) {
        config.alg.search_ended = true;
        clearInterval(config.alg.interval_code);
    }
    config.alg = undefined;
    maze = new Maze(maze_config);
    canvas.width = maze.width * cell_width;
    canvas.height = maze.height * cell_height;
    canvas_refresh(maze);
};

const textfield_volume = document.getElementById("text volume") as HTMLInputElement;
const range_volume = document.getElementById("range volume") as HTMLInputElement;
if (config.audio_config !== undefined) textfield_volume.value = config.audio_config.audio_volume.toString();
textfield_volume.onchange = function () {
    if (config.audio_config === undefined) return;
    const new_value = Math.min(Math.max(Number(textfield_volume.value), 0), 100);
    config.audio_config.audio_volume = new_value;
    range_volume.value = new_value.toString();
    textfield_volume.value = new_value.toString();
};
range_volume.oninput = function () {
    if (config.audio_config !== undefined) config.audio_config.audio_volume = Number(range_volume.value);
    textfield_volume.value = range_volume.value;
};

const textfield_speed = document.getElementById("text speed") as HTMLInputElement;
const range_speed = document.getElementById("range speed") as HTMLInputElement;
textfield_speed.value = config.solve_step_speed.toString();
textfield_speed.onchange = function () {
    const new_value = Math.min(Math.max(Number(textfield_speed.value), 0), 1);
    config.solve_step_speed = new_value;
    config.alg?.update_visualize_interval()
    range_speed.value = new_value.toString();
    textfield_speed.value = new_value.toFixed(2).toString();
};
range_speed.oninput = function () {
    config.solve_step_speed = Number(range_speed.value);
    textfield_speed.value = Number(range_speed.value).toFixed(2).toString();
    config.alg?.update_visualize_interval()
};

const textfield_grid_width = document.getElementById("text grid width") as HTMLInputElement;
const range_grid_width = document.getElementById("range grid width") as HTMLInputElement;
textfield_grid_width.value = maze_config.grid_width.toString();
textfield_grid_width.onchange = function () {
    const new_value = Math.min(Math.max(Number(textfield_grid_width.value), 4), 100);
    maze_config.grid_width = new_value;
    range_grid_width.value = new_value.toString();
    textfield_grid_width.value = new_value.toString();
};
range_grid_width.oninput = function () {
    maze_config.grid_width = Number(range_grid_width.value);
    textfield_grid_width.value = range_grid_width.value;
};

const textfield_grid_height = document.getElementById("text grid height") as HTMLInputElement;
const range_grid_height = document.getElementById("range grid height") as HTMLInputElement;
textfield_grid_height.value = maze_config.grid_height.toString();
textfield_grid_height.onchange = function () {
    const new_value = Math.min(Math.max(Number(textfield_grid_height.value), 4), 100);
    maze_config.grid_height = new_value;
    range_grid_height.value = new_value.toString();
    textfield_grid_height.value = new_value.toString();
};
range_grid_height.oninput = function () {
    maze_config.grid_height = Number(range_grid_height.value);
    textfield_grid_height.value = range_grid_height.value;
};

canvas_refresh(maze);
