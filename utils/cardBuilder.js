const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder, Colors } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const WIDTH = 1200;
const HEIGHT = 750;
const SPACING = 25;
const COLORS = {

    bg: "#313338",

    card: "#2B2D31",

    border: "#404249",

    title: "#FFFFFF",

    text: "#FFFFFF",

    subtitle: "#AAAAAA",

    accent: "#5865F2",

    positive: "#57F287",

    negative: "#ED4245"
};

const chartRenderer = new ChartJSNodeCanvas({
    width: 800,
    height: 300,
    backgroundColour: COLORS.card
});

function drawMetric(ctx, label, value, x, y) {
    const FONT = 18;
    ctx.fillStyle = COLORS.subtitle;
    ctx.font = `${FONT}px sans-serif`;
    ctx.fillText(label, x, y + FONT);

    ctx.fillStyle = COLORS.title;
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(value, x, y + FONT + 34);
}

function drawDelta(ctx, delta, x, y, isPercent) {
    const FONT = 18;
    if (Math.abs(delta) < 0.05) {
        ctx.fillStyle = "#A8A8A8";
        ctx.font = `${FONT}px sans-serif`;
        const format = isPercent? "±0.0%" : "±0";
        ctx.fillText(format, x, y + FONT + 34);
        return;
    }

    const positive = delta > 0;

    ctx.fillStyle = positive
        ? COLORS.positive
        : COLORS.negative;

    ctx.font = `bold ${FONT}px sans-serif`;

    const arrow = positive ? "▲" : "▼";

    ctx.fillText(
        `${arrow} ${Math.abs(delta).toFixed(1)}%`,
        x,
        y
    );
}

function drawCard(ctx, x, y, w, h) {

    ctx.fillStyle = COLORS.card;
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();


    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();

    ctx.moveTo(x + r, y);

    ctx.arcTo(x + w, y, x + w, y + h, r);

    ctx.arcTo(x + w, y + h, x, y + h, r);

    ctx.arcTo(x, y + h, x, y, r);

    ctx.arcTo(x, y, x + w, y, r);

    ctx.closePath();
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

function drawPositionDistribution(ctx, placements, x, given_y) {
    let y = given_y;

    const width = 750 - 2*SPACING;

    const max = Math.max(...placements.map(p => p.count));

    for (const p of placements) {

        ctx.fillStyle = COLORS.subtitle;

        ctx.font = "18px sans-serif";

        ctx.fillText(`#${p.position}`, x, y);

        const w = (p.count / max) * width;

        ctx.fillStyle = COLORS.accent;

        roundRect(ctx, x + 45, y - 15, w, 18, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = COLORS.title;

        ctx.fillText(
            p.count.toString(),
            x + 55 + width,
            y
        );

        y += 42;
    }
}

async function buildMemberStatsCard(stats) {

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    /* LAYOUT:
    ----------------------
    |   title + avatar   |
    ----------------------
    |       |graph       |
    |metrics|------------|
    |       |distribution|
    ---------------------

    */
    drawCard(ctx, 0, 0, WIDTH, HEIGHT);
    //metrics - left till bottom
    const metrics = {
        x: 0 + SPACING,
        y: 100 + SPACING,
        w: 250,
        h: 600
    };
    drawCard(ctx, metrics.x, metrics.y, metrics.w, metrics.h);
    // graph - right till half
    const graph = {
        x: 250 + 2 * SPACING,
        y: 100 + SPACING,
        w: 875,
        h: 375
    };
    drawCard(ctx, graph.x, graph.y, graph.w, graph.h);
    // distribution - right till bottom
    const distribution = {
        x: 250 + 2 * SPACING,
        y: 475 + 2 * SPACING,
        w: 875,
        h: 200
    };
    drawCard(ctx, distribution.x, distribution.y, distribution.w, distribution.h);

    ctx.fillStyle = COLORS.title;
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(`Voice Statistics of ${stats.username}`, 2 * SPACING, 3 * SPACING);

    if (stats.avatar) {

        const avatar = await loadImage(stats.avatar);

        ctx.save();

        ctx.beginPath();
        ctx.arc(1110, 70, 40, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(avatar, 1070, 30, 80, 80);

        ctx.restore();
    }

    drawMetric(ctx, "Current Session",
        `${stats.currentSession.toFixed(1)}%`,
        metrics.x + SPACING,
        metrics.y + SPACING
    );

    drawDelta(ctx, stats.sessionDelta,
        metrics.x + SPACING + 75,
        metrics.y + SPACING,
        true
    );

    drawMetric(ctx, "Current Position",
        `#${stats.currentPosition}`,
        metrics.x + SPACING,
        metrics.y + SPACING + 100
    );

    drawDelta(ctx, stats.sessionDelta,
        metrics.x + SPACING + 75,
        metrics.y + SPACING + 100, 
        false
    );

    drawMetric(ctx, "All Time",
        `${stats.allTime.toFixed(1)}%`,
        metrics.x + SPACING,
        metrics.y + SPACING + 200
    );

    drawMetric(ctx, "Average Position",
        `#${stats.averagePosition.toFixed(1)}`,
        metrics.x + SPACING,
        metrics.y + SPACING + 300
    );

    drawMetric(ctx, "Total Time",
        formatDuration(stats.totalDuration),
        metrics.x + SPACING,
        metrics.y + SPACING + 400
    );

    drawMetric(ctx, "Consistency",
        `${stats.consistency.toFixed(0)}%`,
        metrics.x + SPACING,
        metrics.y + SPACING + 500
    );

    ctx.font = "bold 24px sans-serif";

    ctx.fillStyle = COLORS.title;

    ctx.fillText("Participation Trend", graph.x + SPACING, graph.y + 2 * SPACING);

    ctx.fillText("Position Distribution", distribution.x + SPACING, distribution.y + 2 * SPACING);

    const participation = await chartRenderer.renderToBuffer({

        type: "line",

        data: {
            labels: stats.monthly.map(x => x.month),

            datasets: [{
                data: stats.monthly.map(x => x.percentage),

                borderColor: COLORS.accent,
                backgroundColor: COLORS.accent,

                pointRadius: 5,

                borderWidth: 4,

                fill: true
            }]
        },

        options: {
            responsive: false,
            animation: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            elements: {
                line: {
                    tension: 0.4,
                    borderWidth: 4
                },
                point: {
                    radius: 4,
                    hoverRadius: 5
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },

                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 10,
                        callback: v => `${v}%`
                    }
                }
            }
        }

    });

    const participationImg = await loadImage(participation);

    ctx.drawImage(participationImg, graph.x + 1.5 * SPACING, graph.y + 2.5 * SPACING);

    drawPositionDistribution(ctx, stats.placements, distribution.x + 1.5 * SPACING, distribution.y + 3 * SPACING);

    return canvas.encode("png");
}

module.exports = {
    buildMemberStatsCard,
}
