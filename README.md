# getfit

## V0 features
- ~~Get tflite working~~
- ~~Get eval (non blocking, and low memory footprint)~~
- ~~Draw skeleton on canvas~~
- ~~Plot x,y of keypoint against time - debig tool~~
- Package the camera/tf eval functions to run on button press (debugging right now is too slow)
- Explore pose matching 
    - Heuristics
    - Select 2 exercises for MVP

## Instruction to run
This is currently only a simple html-css-js project. Frameworks may be added when the simplicity becomes a bottleneck. 

To run, download the repo and just start a simple server 
```
python -m http.server
```

Go to ```localhost:8000``` on Chrome to see the site (as opposed to 0.0.0.0:8000) as camera on Chrome only runs on https or localhost. Then click on the debug card. That has eval running. 


## Demo
[](static/vivek-demo.gif)


