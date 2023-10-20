"use strict";
(() => {
  // src/solving_algorithm.ts
  var MazeSolvingAlgorithm = class {
    constructor(visualization_config, maze2) {
      this.search_ended = false;
      this.final_searched_cell = void 0;
      this.interval_code = void 0;
      this.config = visualization_config;
      this.maze = maze2;
    }
    /**
     * Begins drawing the maze solving steps until cancelled externally or the algorithm completes execution
     */
    visualize() {
      this.config.is_paused = false;
      this.interval_code = setInterval(() => {
        if (this.config.alg !== void 0)
          this.config.alg.step.call(this);
      }, calculate_delay(this.config));
    }
    /**
     * Makes sure that the visualization interval is set to the most recent rate supplied by the user
     */
    update_visualize_interval() {
      clearInterval(this.interval_code);
      this.interval_code = setInterval(() => {
        if (this.config.alg !== void 0)
          this.config.alg.step.call(this);
      }, calculate_delay(this.config));
    }
    playNote(frequency, duration) {
      if (this.config.audio_config === void 0 || this.config.audio_config.gain_node === void 0)
        return;
      const oscillator = this.config.audio_config.audio_ctx.createOscillator();
      oscillator.type = "square";
      oscillator.connect(this.config.audio_config.gain_node);
      oscillator.frequency.value = normalize_audio(frequency, this.config.audio_config);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, duration / 2);
    }
    end_visualization() {
      this.config.alg = void 0;
      config.is_paused = true;
    }
    canvas_draw_path(path_cell) {
      if (path_cell.prev_cell !== void 0)
        path_cell = path_cell.prev_cell;
      if (ctx === null)
        return;
      ctx.fillStyle = "purple";
      const draw_step = () => {
        if (ctx === null)
          return;
        if (path_cell.prev_cell === void 0) {
          clearInterval(interval_draw);
          return;
        }
        ctx.fillRect(path_cell.coord.x * cell_width, path_cell.coord.y * cell_height, cell_width, cell_height);
        path_cell = path_cell.prev_cell;
        this.playNote(coordinate_frequency(path_cell.coord), this.config.draw_delay);
      };
      const interval_draw = setInterval(draw_step, this.config.draw_delay);
    }
  };
  var BFS = class extends MazeSolvingAlgorithm {
    constructor(config2, maze2) {
      super(config2, maze2);
      this.next_search_frontier = [];
      this.iterator = this.next_search_frontier.values();
      if (maze2.start !== void 0)
        this.next_search_frontier = [{ coord: maze2.start, prev_cell: void 0 }];
    }
    step() {
      if (this.interval_code === void 0)
        return;
      if (config.is_paused)
        return;
      const next = this.iterator.next();
      let position = next.value;
      let done = next.done === true;
      if (done === true) {
        if (this.next_search_frontier.length === 0)
          this.search_ended = true;
        this.iterator = this.next_search_frontier.values();
        this.next_search_frontier = [];
        position = this.iterator.next().value;
      }
      if (!this.search_ended) {
        maze.set_cell_type(position.coord, 3 /* EXPLORED */);
        for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
          if (coordinate_equals(maze.end, adjacent_position)) {
            this.final_searched_cell = {
              coord: adjacent_position,
              prev_cell: position
            };
            break;
          } else if (maze.get_cell_type(adjacent_position) === 0 /* FLOOR */) {
            maze.set_cell_type(adjacent_position, 2 /* ACTIVE */);
            this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
            this.next_search_frontier.push({
              coord: adjacent_position,
              prev_cell: position
            });
          }
        }
        if (this.final_searched_cell !== void 0) {
          for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
            if (maze.get_cell_type(adjacent_position) === 2 /* ACTIVE */)
              maze.set_cell_type(adjacent_position, 0 /* FLOOR */);
          }
        }
        if (this.final_searched_cell !== void 0)
          this.search_ended = true;
        canvas_refresh(this.maze);
      } else {
        if (this.final_searched_cell !== void 0) {
          this.canvas_draw_path(this.final_searched_cell);
          console.log("Found end");
        } else {
          console.log("Could not find end");
        }
        this.end_visualization();
        clearInterval(this.interval_code);
      }
    }
  };
  var GBFS = class extends MazeSolvingAlgorithm {
    constructor(config2, maze2) {
      super(config2, maze2);
      this.search_frontier = [];
      if (maze2.start !== void 0 && maze2.end !== void 0)
        this.search_frontier = [
          { priority: euclidean_distance(maze2.start, maze2.end), cell: { coord: maze2.start, prev_cell: void 0 } }
        ];
    }
    step() {
      if (maze.end === void 0 || this.interval_code === void 0)
        return;
      if (config.is_paused)
        return;
      const frontier_element = this.search_frontier.shift();
      if (frontier_element === void 0)
        return;
      const position = frontier_element.cell;
      maze.set_cell_type(position.coord, 3 /* EXPLORED */);
      for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
        if (coordinate_equals(maze.end, adjacent_position)) {
          this.final_searched_cell = {
            coord: adjacent_position,
            prev_cell: position
          };
          break;
        } else if (maze.get_cell_type(adjacent_position) === 0 /* FLOOR */) {
          maze.set_cell_type(adjacent_position, 2 /* ACTIVE */);
          this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
          const priority = euclidean_distance(adjacent_position, maze.end);
          let index_to_insert = 0;
          for (const element of this.search_frontier) {
            if (element.priority > priority)
              break;
            index_to_insert++;
          }
          this.search_frontier.splice(index_to_insert, 0, {
            priority,
            cell: { coord: adjacent_position, prev_cell: position }
          });
        }
      }
      if (this.final_searched_cell !== void 0) {
        for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
          if (maze.get_cell_type(adjacent_position) === 2 /* ACTIVE */)
            maze.set_cell_type(adjacent_position, 0 /* FLOOR */);
        }
      }
      if (this.final_searched_cell !== void 0)
        this.search_ended = true;
      if (this.search_frontier.length == 0)
        this.search_ended = true;
      canvas_refresh(this.maze);
      if (this.search_ended) {
        if (this.final_searched_cell !== void 0) {
          this.canvas_draw_path(this.final_searched_cell);
          console.log("Found end");
        } else {
          console.log("Could not find end");
        }
        this.end_visualization();
        clearInterval(this.interval_code);
      }
    }
  };
  var ASTAR = class extends MazeSolvingAlgorithm {
    constructor(config2, maze2) {
      super(config2, maze2);
      this.search_frontier = [];
      if (maze2.start === void 0 || maze2.end === void 0)
        return;
      this.search_frontier = [
        {
          priority: euclidean_distance(maze2.start, maze2.end),
          cell: { coord: maze2.start, prev_cell: void 0 },
          length: 0
        }
      ];
    }
    astar_dist(current_cell, next_coord) {
      if (maze.end === void 0)
        return 0;
      return current_cell.length + euclidean_distance(maze.end, next_coord);
    }
    step() {
      if (maze.end === void 0 || this.interval_code === void 0)
        return;
      if (config.is_paused)
        return;
      const frontier_element = this.search_frontier.shift();
      if (frontier_element === void 0)
        return;
      const position = frontier_element.cell;
      maze.set_cell_type(position.coord, 3 /* EXPLORED */);
      for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
        if (coordinate_equals(maze.end, adjacent_position)) {
          this.final_searched_cell = {
            coord: adjacent_position,
            prev_cell: position
          };
          break;
        } else if (maze.get_cell_type(adjacent_position) === 0 /* FLOOR */) {
          maze.set_cell_type(adjacent_position, 2 /* ACTIVE */);
          this.playNote(coordinate_frequency(adjacent_position), calculate_delay(this.config));
          const priority = this.astar_dist(frontier_element, adjacent_position);
          let index_to_insert = 0;
          for (const element of this.search_frontier) {
            if (element.priority > priority)
              break;
            index_to_insert++;
          }
          this.search_frontier.splice(index_to_insert, 0, {
            priority,
            cell: { coord: adjacent_position, prev_cell: position },
            length: frontier_element.length + 1
          });
        }
      }
      if (this.final_searched_cell !== void 0) {
        for (const adjacent_position of maze.get_neighboring_coordinates(position.coord)) {
          if (maze.get_cell_type(adjacent_position) === 2 /* ACTIVE */)
            maze.set_cell_type(adjacent_position, 0 /* FLOOR */);
        }
      }
      if (this.final_searched_cell !== void 0)
        this.search_ended = true;
      if (this.search_frontier.length === 0)
        this.search_ended = true;
      canvas_refresh(this.maze);
      if (this.search_ended) {
        if (this.final_searched_cell !== void 0) {
          this.canvas_draw_path(this.final_searched_cell);
          console.log("Found end");
        } else {
          console.log("Could not find end");
        }
        this.end_visualization();
        clearInterval(this.interval_code);
      }
    }
  };

  // src/main.ts
  var MazeCell = /* @__PURE__ */ ((MazeCell2) => {
    MazeCell2[MazeCell2["FLOOR"] = 0] = "FLOOR";
    MazeCell2[MazeCell2["WALL"] = 1] = "WALL";
    MazeCell2[MazeCell2["ACTIVE"] = 2] = "ACTIVE";
    MazeCell2[MazeCell2["EXPLORED"] = 3] = "EXPLORED";
    return MazeCell2;
  })(MazeCell || {});
  function euclidean_distance(coord1, coord2) {
    return Math.sqrt((coord1.x - coord2.x) * (coord1.x - coord2.x) + (coord1.y - coord2.y) * (coord1.y - coord2.y));
  }
  function coordinate_frequency(coord) {
    return euclidean_distance(coord, { x: maze.width, y: maze.height });
  }
  function coordinate_equals(coord1, coord2) {
    return coord1?.x === coord2?.x && coord1?.y === coord2?.y;
  }
  function coordinate_random(x, y) {
    return {
      x: Math.floor(Math.random() * x),
      y: Math.floor(Math.random() * y)
    };
  }
  var Maze2 = class {
    constructor(config2) {
      this.floor_likelihood = 0.6;
      this.maze = [];
      this.height = config2.grid_height;
      this.width = config2.grid_width;
      this.start = void 0;
      this.end = void 0;
      this.regenerate();
    }
    get_cell_type(coordinate) {
      return this.maze[coordinate.x][coordinate.y];
    }
    set_cell_type(coordinate, cell_type) {
      if (coordinate_equals(this.start, coordinate) || coordinate_equals(this.end, coordinate))
        return;
      this.maze[coordinate.x][coordinate.y] = cell_type;
    }
    get_neighboring_coordinates(coordinate) {
      const neighbors = [];
      if (coordinate.x + 1 <= this.width - 1)
        neighbors.push({ x: coordinate.x + 1, y: coordinate.y });
      if (coordinate.y + 1 <= this.width - 1)
        neighbors.push({ x: coordinate.x, y: coordinate.y + 1 });
      if (coordinate.x - 1 >= 0)
        neighbors.push({ x: coordinate.x - 1, y: coordinate.y });
      if (coordinate.y - 1 >= 0)
        neighbors.push({ x: coordinate.x, y: coordinate.y - 1 });
      return neighbors;
    }
    regenerate() {
      this.start = coordinate_random(this.width, this.height);
      this.end = coordinate_random(this.width, this.height);
      this.maze.length = 0;
      for (let i = 0; i < this.width; i++) {
        const column = [];
        for (let j = 0; j < this.height; j++) {
          let cell;
          if (Math.random() < this.floor_likelihood) {
            cell = 0 /* FLOOR */;
          } else {
            cell = 1 /* WALL */;
          }
          column.push(cell);
        }
        this.maze.push(column);
      }
      this.set_cell_type(this.start, 3 /* EXPLORED */);
      this.set_cell_type(this.end, 0 /* FLOOR */);
    }
    reload() {
      for (let i = 0; i < this.width; i++) {
        for (let j = 0; j < this.height; j++) {
          if (this.maze[i][j] == 2 /* ACTIVE */ || this.maze[i][j] == 3 /* EXPLORED */)
            this.set_cell_type({ x: i, y: j }, 0 /* FLOOR */);
        }
      }
    }
  };
  function calculate_delay(config2) {
    return config2.max_delay / config2.solve_step_speed;
  }
  function calculate_volume(config2) {
    if (config2.audio_config === void 0)
      return 0;
    return config2.audio_config.audio_volume / 100;
  }
  function normalize_audio(frequency, config2) {
    if (config2 == void 0)
      return 0;
    frequency /= Math.sqrt(maze.width * maze.width + maze.height * maze.height);
    frequency *= config2.audio_range_frequency;
    frequency += config2.audio_min_frequency;
    return frequency;
  }
  function canvas_refresh(maze2) {
    if (ctx === null)
      return;
    ctx.fillStyle = "black";
    ctx.fill();
    for (let i = 0; i < maze2.width; i++) {
      for (let j = 0; j < maze2.height; j++) {
        let color = color_floor;
        if (maze2.maze[i][j] === 0 /* FLOOR */)
          color = color_floor;
        else if (maze2.maze[i][j] === 1 /* WALL */)
          color = color_wall;
        else if (maze2.maze[i][j] === 2 /* ACTIVE */)
          color = color_active;
        else if (maze2.maze[i][j] === 3 /* EXPLORED */)
          color = color_explored;
        if (maze2.start?.x === i && maze2.start?.y === j)
          color = color_start;
        if (maze2.end?.x === i && maze2.end?.y === j)
          color = color_end;
        ctx.fillStyle = color;
        ctx.fillRect(i * cell_width, j * cell_height, cell_width, cell_height);
      }
    }
  }
  function canvas_draw_rect_with_preview(nearest_position, actual_position, color) {
    if (ctx === null)
      return;
    if (maze.start !== void 0 && maze.end !== void 0) {
      ctx.fillStyle = color_floor;
      if (color === color_end) {
        ctx.fillRect(maze.end.x * cell_width, maze.end.y * cell_height, cell_width, cell_height);
      } else {
        ctx.fillRect(maze.start.x * cell_width, maze.start.y * cell_height, cell_width, cell_height);
      }
    }
    ctx.fillStyle = color_indicator;
    ctx.fillRect(nearest_position.x, nearest_position.y, cell_width, cell_height);
    ctx.fillStyle = color;
    ctx.fillRect(actual_position.x - cell_width / 2, actual_position.y - cell_height / 2, cell_width, cell_height);
  }
  var maze_config = { grid_width: 40, grid_height: 20 };
  var maze = new Maze2(maze_config);
  var color_start = "green";
  var color_end = "red";
  var color_explored = "gray";
  var color_active = "yellow";
  var color_wall = "black";
  var color_floor = "white";
  var color_indicator = "blue";
  var canvas = document.getElementById("maze_canvas");
  var cell_width = 15;
  var cell_height = 15;
  var ctx = canvas.getContext("2d");
  var click_event = {
    mouse_down: false,
    start_coordinate: {
      x: 0,
      y: 0
    },
    current_coordinate: {
      x: 0,
      y: 0
    },
    current_nearest_coordinate: {
      x: 0,
      y: 0
    },
    is_dragging_start: false,
    is_dragging_end: false,
    brush_type: 1 /* WALL */
  };
  function cancel_click() {
    click_event.mouse_down = false;
    click_event.is_dragging_end = false;
    click_event.is_dragging_start = false;
  }
  canvas.onmousedown = function(e) {
    if (config.alg !== void 0 || click_event.mouse_down)
      return;
    const canvas_rect = canvas.getBoundingClientRect();
    const clicked_coordinate = {
      x: Math.floor((e.clientX - canvas_rect.left) / canvas.width * maze.width),
      y: Math.floor((e.clientY - canvas_rect.top) / canvas.height * maze.height)
    };
    click_event.start_coordinate = clicked_coordinate;
    click_event.mouse_down = true;
    if (coordinate_equals(maze.start, clicked_coordinate)) {
      click_event.is_dragging_start = true;
    } else if (coordinate_equals(maze.end, clicked_coordinate)) {
      click_event.is_dragging_end = true;
    } else {
      const clicked_type = maze.get_cell_type(clicked_coordinate);
      click_event.brush_type = clicked_type == 1 /* WALL */ ? 0 /* FLOOR */ : 1 /* WALL */;
    }
  };
  canvas.onmousemove = function(e) {
    if (config.alg !== void 0 || !click_event.mouse_down)
      return;
    const canvas_rect = canvas.getBoundingClientRect();
    click_event.current_coordinate = {
      x: (e.clientX - canvas_rect.left) / canvas.width * maze.width,
      y: (e.clientY - canvas_rect.top) / canvas.height * maze.height
    };
    click_event.current_nearest_coordinate = {
      x: Math.floor(click_event.current_coordinate.x),
      y: Math.floor(click_event.current_coordinate.y)
    };
    if (!click_event.is_dragging_start && !click_event.is_dragging_end) {
      maze.set_cell_type(click_event.current_nearest_coordinate, click_event.brush_type);
      canvas_refresh(maze);
      return;
    }
    let color = color_start;
    if (click_event.is_dragging_end)
      color = color_end;
    const actual_position = {
      x: click_event.current_coordinate.x * cell_width,
      y: click_event.current_coordinate.y * cell_height
    };
    const nearest_position = {
      x: click_event.current_nearest_coordinate.x * cell_width,
      y: click_event.current_nearest_coordinate.y * cell_height
    };
    canvas_refresh(maze);
    canvas_draw_rect_with_preview(nearest_position, actual_position, color);
  };
  canvas.onmouseup = function(e) {
    const canvas_rect = canvas.getBoundingClientRect();
    click_event.current_coordinate = {
      x: (e.clientX - canvas_rect.left) / canvas.width * maze.width,
      y: (e.clientY - canvas_rect.top) / canvas.height * maze.height
    };
    const nearest = {
      x: Math.floor(click_event.current_coordinate.x),
      y: Math.floor(click_event.current_coordinate.y)
    };
    if (click_event.is_dragging_start) {
      if (maze.start === void 0)
        return;
      const displaced_type = maze.get_cell_type(nearest);
      maze.set_cell_type(nearest, 0 /* FLOOR */);
      maze.set_cell_type(maze.start, displaced_type);
      maze.start = nearest;
    } else if (click_event.is_dragging_end) {
      if (maze.end === void 0)
        return;
      const displaced_type = maze.get_cell_type(nearest);
      maze.set_cell_type(nearest, 0 /* FLOOR */);
      maze.set_cell_type(maze.end, displaced_type);
      maze.end = nearest;
    } else if (coordinate_equals(click_event.start_coordinate, nearest)) {
      if (maze.get_cell_type(nearest) == 0 /* FLOOR */) {
        maze.set_cell_type(nearest, 1 /* WALL */);
      } else {
        maze.set_cell_type(nearest, 0 /* FLOOR */);
      }
    }
    cancel_click();
    canvas_refresh(maze);
  };
  var audio = document.createElement("AUDIO");
  var audio_context = new (window.AudioContext || window.AudioContext)();
  var config = {
    is_paused: true,
    alg: void 0,
    max_delay: 50,
    solve_step_speed: 0.5,
    draw_delay: 50,
    audio_config: {
      audio_volume: 25,
      audio_min_frequency: 200,
      audio_range_frequency: 100,
      audio_ctx: audio_context,
      gain_node: audio_context.createGain()
    }
  };
  config.audio_config?.gain_node.gain.setValueAtTime(calculate_volume(config), 0);
  config.audio_config?.gain_node.connect(config.audio_config.audio_ctx.destination);
  var button_start = document.getElementById("start");
  button_start.onclick = function() {
    cancel_click();
    if (config.is_paused && config.alg !== void 0) {
      config.is_paused = false;
      return;
    }
    maze.reload();
    if (document.getElementById("bfs").checked)
      config.alg = new BFS(config, maze);
    if (document.getElementById("gbfs").checked)
      config.alg = new GBFS(config, maze);
    if (document.getElementById("a*").checked)
      config.alg = new ASTAR(config, maze);
    if (config.alg !== void 0)
      config.alg.visualize();
  };
  var button_stop = document.getElementById("stop");
  button_stop.onclick = function() {
    config.is_paused = true;
  };
  var button_clear = document.getElementById("clear");
  button_clear.onclick = function() {
    cancel_click();
    if (config.alg !== void 0) {
      config.alg.search_ended = true;
      clearInterval(config.alg.interval_code);
    }
    config.alg?.end_visualization();
    maze.reload();
    canvas_refresh(maze);
  };
  var button_regenerate = document.getElementById("regenerate");
  button_regenerate.onclick = function() {
    cancel_click();
    if (config.alg !== void 0) {
      config.alg.search_ended = true;
      clearInterval(config.alg.interval_code);
    }
    config.alg = void 0;
    maze = new Maze2(maze_config);
    canvas.width = maze.width * cell_width;
    canvas.height = maze.height * cell_height;
    canvas_refresh(maze);
  };
  var textfield_volume = document.getElementById("text volume");
  var range_volume = document.getElementById("range volume");
  if (config.audio_config !== void 0)
    textfield_volume.value = config.audio_config.audio_volume.toString();
  textfield_volume.onchange = function() {
    if (config.audio_config === void 0)
      return;
    const new_value = Math.min(Math.max(Number(textfield_volume.value), 0), 100);
    config.audio_config.audio_volume = new_value;
    range_volume.value = new_value.toString();
    textfield_volume.value = new_value.toString();
    config.audio_config.audio_volume = new_value;
    config.audio_config?.gain_node.gain.setValueAtTime(calculate_volume(config), 0);
  };
  range_volume.oninput = function() {
    if (config.audio_config !== void 0)
      config.audio_config.audio_volume = Number(range_volume.value);
    textfield_volume.value = range_volume.value;
    config.audio_config?.gain_node.gain.setValueAtTime(calculate_volume(config), 0);
  };
  var textfield_speed = document.getElementById("text speed");
  var range_speed = document.getElementById("range speed");
  textfield_speed.value = config.solve_step_speed.toString();
  textfield_speed.onchange = function() {
    const new_value = Math.min(Math.max(Number(textfield_speed.value), 0), 1);
    config.solve_step_speed = new_value;
    config.alg?.update_visualize_interval();
    range_speed.value = new_value.toString();
    textfield_speed.value = new_value.toFixed(2).toString();
  };
  range_speed.oninput = function() {
    config.solve_step_speed = Number(range_speed.value);
    textfield_speed.value = Number(range_speed.value).toFixed(2).toString();
    config.alg?.update_visualize_interval();
  };
  var textfield_grid_width = document.getElementById("text grid width");
  var range_grid_width = document.getElementById("range grid width");
  textfield_grid_width.value = maze_config.grid_width.toString();
  textfield_grid_width.onchange = function() {
    const new_value = Math.min(Math.max(Number(textfield_grid_width.value), 4), 100);
    maze_config.grid_width = new_value;
    range_grid_width.value = new_value.toString();
    textfield_grid_width.value = new_value.toString();
  };
  range_grid_width.oninput = function() {
    maze_config.grid_width = Number(range_grid_width.value);
    textfield_grid_width.value = range_grid_width.value;
  };
  var textfield_grid_height = document.getElementById("text grid height");
  var range_grid_height = document.getElementById("range grid height");
  textfield_grid_height.value = maze_config.grid_height.toString();
  textfield_grid_height.onchange = function() {
    const new_value = Math.min(Math.max(Number(textfield_grid_height.value), 4), 100);
    maze_config.grid_height = new_value;
    range_grid_height.value = new_value.toString();
    textfield_grid_height.value = new_value.toString();
  };
  range_grid_height.oninput = function() {
    maze_config.grid_height = Number(range_grid_height.value);
    textfield_grid_height.value = range_grid_height.value;
  };
  canvas_refresh(maze);
})();
