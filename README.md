# HOW TO

1. Install typescript compiler `npm install -g typescript` (You need the node package manager for this obviously)
2. Transpile to javascript using bundler `npm run build`
3. Open `index.html` in favorite browser

## ABOUT

I wanted to learn how to use html and typescript in case I need to do some web development down the line.
For content to put on the webpage for now I will do something I've been wanting to make for a while, a maze solving algorithm visualizer.

I have seen people do this in the past on youtube:
- https://www.youtube.com/watch?v=9W8hNdEUFbc&ab_channel=CodeNoodles
actually quite a few so I won't list more.

## COMPLETED

- Ability to generate random maze
- Ability to modify generated maze
- Multiple maze solving algorithms
- Visualize steps of solution
- Visualization options

## TODO

- Make it so that generated maze is guaranteed to be solvable
- Add more algs including:
    - uniform cost search
    - depth-limited search
    - iterative deepening search
    - Bi-directional search 
- Add color legend

- Figure out why canvas does not refresh while dragging mouse until mouseup
- Figure out why sound is sometimes not playing
