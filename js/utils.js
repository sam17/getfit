import { videoHeight, videoWidth, selectedPartToTrack, parts, framesEvalsToTrack, dataStore, 
    movement, movement_kf, calibrationDone, doCalibrate, modifyCalibrationDone, timerClock, 
    modifyTimerClock, calibrationMarginA, calibrationMarginB, doEval, animationFrame,
    modifyAnimationFrame } from './config.js'
import { drawKeypoints, drawSkeleton, plotxy, drawVideo } from './draw.js'


export function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

export function printToConsole(pose,part){
    if(calibrationDone){
        console.log(parts[part],pose.keypoints[part].position.x,pose.keypoints[part].position.y);
    }
}


export function saveLogToFile(){
    (function(console){

        console.save = function(data, filename){
        
            if(!data) {
                console.error('Console.save: No data')
                return;
            }
        
            if(!filename) filename = 'console.json'
        
            if(typeof data === "object"){
                data = JSON.stringify(data, undefined, 4)
            }
        
            var blob = new Blob([data], {type: 'text/json'}),
                e    = document.createEvent('MouseEvents'),
                a    = document.createElement('a')
        
            a.download = filename
            a.href = window.URL.createObjectURL(blob)
            a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
            a.dispatchEvent(e)
         }
        })(console)
}



export function feedbackDuringCalibration(target, currentState){
    // console.log('Feedback blah blah');
    const minY = Math.min(...currentState.map((d)=>(d.y)));
    const maxY = Math.max(...currentState.map((d)=>(d.y)));
    const minX = Math.min(...currentState.map((d)=>(d.x)));
    const maxX = Math.max(...currentState.map((d)=>(d.x)));
    
    
    const heightMarginTopMin = calibrationMarginA*videoHeight;
    const heightMarginTopMax = calibrationMarginB*videoHeight;

    const heightMarginBottomMin = videoHeight - heightMarginTopMax;
    const heightMarginBottomMax = videoHeight - heightMarginTopMin;

    const widthMarginLeftMin = calibrationMarginA*videoWidth;
    const widthMarginLeftMax = calibrationMarginB*videoWidth;

    const widthMarginRightMin = videoWidth - widthMarginLeftMax;
    const widthMarginRightMax = videoWidth - widthMarginLeftMin;

    // console.log(minY,maxY,minX,maxX);
    // console.log(heightMarginTopMin, heightMarginTopMax, heightMarginBottomMin, heightMarginBottomMax);
    // console.log(widthMarginLeftMin, widthMarginLeftMax, widthMarginRightMin, widthMarginRightMax);

    if (currentState.reduce((b,c)=>(b+c.confidence),0)==target.length){
        if (minY>=heightMarginTopMin && maxY<=heightMarginBottomMax){
                if (minX>=widthMarginLeftMin){
                    if (maxX<=widthMarginRightMax){
                        $("#feedback-calibration").html("Perfect!");
                        modifyCalibrationDone(true);
                    }
                    else{
                        $("#feedback-calibration").html("Please step slightly to the left");
                        modifyCalibrationDone(false);
                    }
                }
                else{
                    $("#feedback-calibration").html("Please step slightly to the Right");
                    modifyCalibrationDone(false);
                }
            }
            else{
                $("#feedback-calibration").html("Please step slightly further Away");
                modifyCalibrationDone(false);
            }
        }
    else{
        $("#feedback-calibration").html("Please make sure that all the keypoints are ticked");
        modifyCalibrationDone(false);
    }
    
}



export function timer(){
    setInterval(() => {
        if (calibrationDone){
            timerClock.s++;
            if (timerClock.s>=60){
                timerClock.s=0;
                timerClock.m++;
                if (timerClock.m>=60){
                    timerClock.s=0;
                    timerClock.m=0;
                    timerClock.h++;
                }

            }
            modifyTimerClock(timerClock.h,timerClock.m,timerClock.s);
        }
        // console.log(timerClock);
    }, 1000);
}


export function calibrate(keypoints, minPartConfidence, calibrationPosition) {
    // console.log('Do calibrate : ', doCalibrate, "Calibration Done", calibrationDone);

    if (doCalibrate) {
        let calibrationState = calibrationPosition.map(()=>({x:0,y:0,confidence:0}));
        calibrationPosition.forEach((index) => {
            $('.label[data-key="' + index + '"]').show();
            $('.x[data-key="' + index + '"]').show();
        })
        keypoints.forEach((pt, i) => {
            if (calibrationPosition.indexOf(i)>=0){
                if (pt.score >= minPartConfidence) {
                    calibrationState[i].confidence = 1;
                    calibrationState[i].x = pt.position.x;
                    calibrationState[i].y = pt.position.y;
                    $('.x[data-key="' + i + '"]').hide();
                    $('.check[data-key="' + i + '"]').show();
                }
                else {
                    
                    calibrationState[i].confidence = 0;
                    calibrationState[i].x = pt.position.x;
                    calibrationState[i].y = pt.position.y;
                    $('.x[data-key="' + i + '"]').show();
                    $('.check[data-key="' + i + '"]').hide();
                }
            }
            
        });
        
        
        feedbackDuringCalibration(calibrationPosition, calibrationState);

    }
}



export async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    var video = document.querySelector("#videoElement");
    video.width = videoWidth;
    video.height = videoHeight;

    const stream = await navigator.mediaDevices.getUserMedia({
        'video': true
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

export async function loadVideo() {
    const video = await setupCamera();
    video.play();

    return video;
}

export function detectPoseInRealTime(video, net, func) {
    var kf = new KalmanFilter();

    const minPoseConfidence = 0.1;
    const minPartConfidence = 0.5;


    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    canvas.width = videoWidth;
    canvas.height = videoHeight;


    async function poseDetectionFrame() {
        if(doEval){
            let poses = [];
            const pose = await net.estimatePoses(video, {
                flipHorizontal: true,
                decodingMethod: 'single-person'
            });
            poses = poses.concat(pose);

            poses[0]['timestamp'] = new Date().getTime();

            if (movement.length < framesEvalsToTrack) {
                movement.push(pose[0].keypoints[selectedPartToTrack].position.y);
                movement_kf.push(kf.filter(pose[0].keypoints[selectedPartToTrack].position.y));
            }
            else {
                movement.shift();
                movement_kf.push(kf.filter(pose[0].keypoints[selectedPartToTrack].position.y));
            }

            if (dataStore.length < framesEvalsToTrack) {
                dataStore.push(pose[0]);
            }
            else {
                dataStore.shift();
                dataStore.push(pose[0]);
            }

            
            printToConsole(poses[0],0);

            poses.forEach(({ score, keypoints }) => {
                if (score >= minPoseConfidence) {
    
                    func(video, ctx, keypoints, minPartConfidence, 400, 450);
    
                }
            });
        
        }

        
        
        else{
            func(video, ctx, [], minPartConfidence, 400, 450);
        }
        

        // End monitoring code for frames per second

            let tempAnimationFrame = requestAnimationFrame(poseDetectionFrame);
            modifyAnimationFrame(tempAnimationFrame);
    }

    let tempAnimationFrame = poseDetectionFrame();
    modifyAnimationFrame(tempAnimationFrame);
}

