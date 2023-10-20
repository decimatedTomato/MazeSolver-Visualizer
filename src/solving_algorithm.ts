import { Coordinate, canvas_refresh, VisualizationConfig, config, Maze, maze, MazeCell, coordinate_equals, ctx, euclidean_distance, searched_cell, cell_width, cell_height, calculate_delay, coordinate_frequency, normalize_audio } from "./main";
export { MazeSolvingAlgorithm, GBFS, BFS, ASTAR };

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
        oscillator.frequency.value = normalize_audio(frequency, this.config.audio_config);
        oscillator.start();

        setTimeout(() => {
            oscillator.stop();
        }, duration / 2);
    }

    public end_visualization() {
        this.config.alg = undefined;
        config.is_paused = true;
    }

    protected canvas_draw_path(path_cell: searched_cell) {
        if (path_cell.prev_cell !== undefined) path_cell = path_cell.prev_cell;
        if (ctx === null) return;
        ctx.fillStyle = "purple";
        const draw_step = () => {
            if (ctx === null) return;
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
            this.end_visualization();
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
    heuristic: (arg1: any, arg2: any) => number = euclidean_distance;

    constructor(config: VisualizationConfig, maze: Maze) {
        super(config, maze);
        if (maze.start !== undefined && maze.end !== undefined)
            this.search_frontier = [
                { priority: this.heuristic(maze.start, maze.end), cell: { coord: maze.start, prev_cell: undefined } },
            ];
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
                const priority = this.heuristic(adjacent_position, maze.end);
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
            this.end_visualization();
            clearInterval(this.interval_code);
        }
    }
}

type priority_queue_length_element = {
    priority: number;
    cell: searched_cell;
    length: number;
};
class ASTAR extends MazeSolvingAlgorithm {
    search_frontier: Array<priority_queue_length_element> = [];
    heuristic: (arg1: any, arg2: any) => number = euclidean_distance;

    constructor(config: VisualizationConfig, maze: Maze) {
        super(config, maze);
        if (maze.start === undefined || maze.end === undefined) return;
        this.search_frontier = [
            {
                priority: this.heuristic(maze.start, maze.end),
                cell: { coord: maze.start, prev_cell: undefined },
                length: 0,
            },
        ];
    }

    private astar_dist(current_cell: priority_queue_length_element, next_coord: Coordinate) {
        if (maze.end === undefined) return 0;
        return current_cell.length + this.heuristic(maze.end, next_coord);
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
                const priority = this.astar_dist(frontier_element, adjacent_position);
                let index_to_insert = 0;
                for (const element of this.search_frontier) {
                    if (element.priority > priority) break;
                    index_to_insert++;
                }
                this.search_frontier.splice(index_to_insert, 0, {
                    priority: priority,
                    cell: { coord: adjacent_position, prev_cell: position },
                    length: frontier_element.length + 1,
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
            this.end_visualization();
            clearInterval(this.interval_code);
        }
    }
}