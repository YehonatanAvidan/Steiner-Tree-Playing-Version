// Connect-the-Dots Game v6.2

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const resetButton = document.getElementById('resetButton');
const levelButtons = document.querySelectorAll('.level-button');
const POINT_RADIUS = 15; // Large point size
const SMALL_POINT_RADIUS = POINT_RADIUS / 2; // Size of endpoint dots
const SNAP_DISTANCE = POINT_RADIUS * 1.5; // Distance to snap to points
let points = [];
let connections = [];
let totalLength = 0;
let isDragging = false;
let dragStart = null;
let dragEnd = null;
let connectedGraph = []; // List to track connected points
let initialScore = 0; // Variable to store the initial score
let currentLevel = 1; // Current level, default to 1

// Calculate number of points for a given level
function getPointsForLevel(level) {
    return 2 * level + 1;
}

// Calculate centroid of points
function calculateCentroid(points) {
    const sum = points.reduce((acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y
    }), { x: 0, y: 0 });
    return {
        x: sum.x / points.length,
        y: sum.y / points.length
    };
}

// Calculate initial score
function calculateInitialScore(points, centroid) {
    return points.reduce((total, point) => 
        total + distanceBetweenPoints(point, centroid), 0) / 10; // Divide by 10
}

// Generate random points
function generateRandomPoints() {
    points = [];
    connections = [];
    const N = getPointsForLevel(currentLevel);
    const minDistance = POINT_RADIUS * 2; // Minimum distance between points to avoid overlap

    while (points.length < N) {
        const x = Math.random() * (canvas.width - 2 * POINT_RADIUS) + POINT_RADIUS;
        const y = Math.random() * (canvas.height - 2 * POINT_RADIUS) + POINT_RADIUS;
        const newPoint = { x, y, id: points.length, isIntermediate: false };

        // Check if the new point is too close to any existing point
        const isTooClose = points.some(p => distanceBetweenPoints(p, newPoint) < minDistance);
        
        if (!isTooClose) {
            points.push(newPoint);
        }
    }

    // Calculate initial score
    const centroid = calculateCentroid(points);
    initialScore = calculateInitialScore(points, centroid);
    totalLength = 0;
    updateScore();
}

// Draw all points and connections
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    connections.forEach(conn => {
        ctx.beginPath();
        ctx.moveTo(conn.start.x, conn.start.y);
        ctx.lineTo(conn.end.x, conn.end.y);
        ctx.stroke();
    });

    // Draw points
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.isIntermediate ? SMALL_POINT_RADIUS : POINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = connectedGraph.includes(point) ? 'green' : (point.isIntermediate ? 'black' : 'blue');
        ctx.fill();
    });

    // Draw drag line
    if (isDragging && dragStart && dragEnd) {
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragEnd.x, dragEnd.y);
        ctx.stroke();
    }
}

// Calculate distance between two points
function distanceBetweenPoints(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// Find the closest point within snap distance
function findClosestPoint(point) {
    let closestPoint = null;
    let minDistance = Infinity;

    points.forEach(p => {
        const distance = distanceBetweenPoints(point, p);
        if (distance < minDistance && distance <= SNAP_DISTANCE) {
            minDistance = distance;
            closestPoint = p;
        }
    });

    return closestPoint;
}

// Add a new connection
function addConnection(start, end) {
    const snappedEnd = findClosestPoint(end) || end;
    let endPoint;

    if (snappedEnd === end) {
        // Create a new intermediate point
        endPoint = { x: end.x, y: end.y, id: points.length, isIntermediate: true };
        points.push(endPoint);
    } else {
        endPoint = snappedEnd;
    }

    connections.push({ start, end: endPoint });
    totalLength += distanceBetweenPoints(start, endPoint) / 10; // Divide by 10
    updateScore();

    // Update connectedGraph
    if (connectedGraph.includes(start)) {
        if (!connectedGraph.includes(endPoint)) {
            connectedGraph.push(endPoint);
        }
    } else if (connectedGraph.includes(endPoint)) {
        connectedGraph.push(start);
    }

    updateConnectedGraph();
    checkGameEnd();
}

// Update the score
function updateScore() {
    const currentScore = initialScore - totalLength;
    scoreElement.textContent = `Score: ${currentScore.toFixed(2)}`;
}

// Update the connected graph
function updateConnectedGraph() {
    let changed;
    do {
        changed = false;
        connections.forEach(conn => {
            if (connectedGraph.includes(conn.start) && !connectedGraph.includes(conn.end)) {
                connectedGraph.push(conn.end);
                changed = true;
            } else if (connectedGraph.includes(conn.end) && !connectedGraph.includes(conn.start)) {
                connectedGraph.push(conn.start);
                changed = true;
            }
        });
    } while (changed);
}

// Check if the game has ended
function checkGameEnd() {
    if (points.filter(p => !p.isIntermediate).every(point => connectedGraph.includes(point))) {
        setTimeout(() => {
            const finalScore = initialScore - totalLength;
            alert(`Congratulations! You've connected all points. Final Score: ${finalScore.toFixed(2)}`);
        }, 100);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
    }
}

// Handle mouse down event
function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const clickPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

    // Only start dragging if the clicked point is on an existing point
    const closestPoint = findClosestPoint(clickPoint);
    if (closestPoint && distanceBetweenPoints(clickPoint, closestPoint) <= POINT_RADIUS) {
        if (connectedGraph.length === 0) {
            connectedGraph.push(closestPoint); // Add the first point to connectedGraph
        }
        dragStart = closestPoint;
        isDragging = true;
    }
}

// Handle mouse move event
function handleMouseMove(event) {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        dragEnd = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        draw();
    }
}

// Handle mouse up event
function handleMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        if (dragStart && dragEnd) {
            addConnection(dragStart, dragEnd);
        }
        dragStart = null;
        dragEnd = null;
        draw();
    }
}

// Reset the game
function resetGame() {
    generateRandomPoints();
    connections = [];
    connectedGraph = []; // Reset connected graph
    draw();
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
}

// Change level
function changeLevel(level) {
    currentLevel = level;
    resetGame();
}

// Initialize the game
function init() {
    generateRandomPoints();
    draw();
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    resetButton.addEventListener('click', resetGame);
    
    // Add event listeners for level buttons
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const level = parseInt(button.dataset.level);
            changeLevel(level);
        });
    });
}

// Start the game
init();
