import {setupCamera, loadVideo, detectPoseInRealTime} from './utils.js'

import {drawKeypoints, drawSkeleton, plotxy, drawVideo, drawEverything} from './draw.js'

import {videoHeight, videoWidth, selectedPartToTrack, parts, framesEvalsToTrack, dataStore, movement, movement_kf} from './config.js'





async function bindPage() {


    let video;
    video = await loadVideo();


    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const drawInterval = setInterval(function () {
        drawVideo(video, ctx);
    }, 50);


    $('#start-eval').toggleClass('disabled');

    $('#start-eval').click(async function() {
        $('#eval-button-container').hide();
        $('#part-buttons').show();
        $('#plot').show();
        console.log("Downloading the Model")


        const net = await posenet.load({
            architecture: 'ResNet50',
            outputStride: 32,
            inputResolution: { width: 257, height: 200 },
            quantBytes: 2
        });

        console.log("Model Downloaded.")

        clearInterval(drawInterval);
        detectPoseInRealTime(video, net, drawEverything);

        $('.debug-part-select').click(function () {
            selectedPartToTrack = $(this).attr('data-key');
        })
    })



}

$('#start-video').click(function () {
    $('#video-button-container').hide();
    $('#output').show();
    bindPage();
})


// i=0
// data_out = []
// for (j=0; j < 17; j++) {
//   data_out.push([dataStore[i].keypoints[j].position.x, dataStore[i].keypoints[j].position.y, dataStore[i].keypoints[j].score]);
// }
// for(i=0;i<data_out.length; i++){console.log("[ ", data_out[i][0],", ", data_out[i][1], ", ", data_out[i][2], " ],");}
