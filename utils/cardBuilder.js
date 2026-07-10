const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const WIDTH = 1200;
const HEIGHT = 700;
const chartRenderer = new ChartJSNodeCanvas({
    width: 700,
    height: 250,
    backgroundColour: '#2b2d31'
});

const placementRenderer = new ChartJSNodeCanvas({
    width: 350,
    height: 250,
    backgroundColour: '#2b2d31'
});

function drawMetric(ctx,label,value,x,y){

    ctx.fillStyle="#AAAAAA";
    ctx.font="18px sans-serif";
    ctx.fillText(label,x,y);

    ctx.fillStyle="white";
    ctx.font="bold 26px sans-serif";
    ctx.fillText(value,x,y+30);
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

async function buildMemberStatsCard(stats) {

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    //
    // Background
    //

    ctx.fillStyle = "#313338";
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    //
    // Header
    //

    ctx.fillStyle = "white";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText("Voice Statistics",40,55);

    //
    // Avatar
    //

    if(stats.avatar){

        const avatar = await loadImage(stats.avatar);

        ctx.save();

        ctx.beginPath();
        ctx.arc(1110,70,40,0,Math.PI*2);
        ctx.clip();

        ctx.drawImage(avatar,1070,30,80,80);

        ctx.restore();
    }

    //
    // Name
    //

    ctx.font = "28px sans-serif";
    ctx.fillText(stats.username,40,105);

    //
    // Metrics
    //

    drawMetric(ctx,"Last Session",
        `${stats.lastSession.toFixed(1)}%`,
        40,
        160
    );

    drawMetric(ctx,"Current Session",
        `${stats.currentSession.toFixed(1)}%`,
        40,
        230
    );

    drawMetric(ctx,"All Time",
        `${stats.allTime.toFixed(1)}%`,
        40,
        300
    );

    drawMetric(ctx,"Average Position",
        `#${stats.averagePosition.toFixed(1)}`,
        350,
        160
    );

    drawMetric(ctx,"Total Time",
        formatDuration(stats.totalDuration),
        350,
        230
    );

    //
    // Participation chart
    //

    const participation = await chartRenderer.renderToBuffer({

        type:"line",

        data:{
            labels:stats.monthly.map(x=>x.month),

            datasets:[{
                label:"Participation %",
                data:stats.monthly.map(x=>x.percentage),
                borderWidth:3,
                tension:0.3
            }]
        },

        options:{
            plugins:{
                legend:{
                    display:false
                }
            },
            scales:{
                y:{
                    min:0,
                    max:100
                }
            }
        }

    });

    const participationImg = await loadImage(participation);

    ctx.drawImage(participationImg,460,130);

    //
    // Placement chart
    //

    const placements = await placementRenderer.renderToBuffer({

        type:"bar",

        data:{

            labels:stats.placements.map(x=>`#${x.position}`),

            datasets:[{
                data:stats.placements.map(x=>x.count)
            }]
        },

        options:{
            plugins:{
                legend:{
                    display:false
                }
            }
        }

    });

    const placementImg = await loadImage(placements);

    ctx.drawImage(placementImg,40,390);

    return canvas.encode("png"); 
}

module.exports = {
    buildMemberStatsCard,
}
