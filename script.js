// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorOverlay = document.getElementById('errorOverlay');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const gestureEmoji = document.getElementById('gestureEmoji');
const gestureText = document.getElementById('gestureText');

// State
let hands;
let camera;
let currentGesture = null;

// Gesture Definitions
const GESTURES = {
    HAND_SHAKE: { name: 'Hand Shake', emoji: '🤝' },
    THUMBS_UP: { name: 'Thumbs Up', emoji: '👍' },
    VICTORY: { name: 'Victory / Two', emoji: '✌️' },
    ONE: { name: 'One', emoji: '1️⃣' },
    THREE: { name: 'Three', emoji: '3️⃣' },
    FOUR: { name: 'Four', emoji: '4️⃣' },
    FIVE: { name: 'High Five / Open Hand', emoji: '👋' },
    CLOSED_FIST: { name: 'Closed Fist', emoji: '✊' },
    POINTING: { name: 'Pointing', emoji: '☝️' },
    NONE: { name: 'Show your hands', emoji: '👋' }
};

// Initialize the app
async function init() {
    try {
        await setupCamera();
        await setupMediaPipe();
        hideLoading();
    } catch (error) {
        showError(error.message);
    }
}

// Setup Camera
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        });

        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            throw new Error('Camera access denied. Please allow camera permissions.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('No camera found. Please connect a camera.');
        } else {
            throw new Error('Failed to access camera: ' + error.message);
        }
    }
}

// Setup MediaPipe Hands
async function setupMediaPipe() {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({ image: video });
        },
        width: 1280,
        height: 720
    });

    camera.start();
}

// Process MediaPipe Results
function onResults(results) {
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Hands
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#00f2fe',
                lineWidth: 5
            });
            drawLandmarks(canvasCtx, landmarks, {
                color: '#ffffff',
                lineWidth: 2,
                radius: 3
            });
        }

        // Detect Gestures
        const gesture = detectGesture(results.multiHandLandmarks);
        updateGestureDisplay(gesture);
    } else {
        updateGestureDisplay(GESTURES.NONE);
    }

    canvasCtx.restore();
}

// Detect Gesture
function detectGesture(landmarksList) {
    // 1. Check for Hand Shake (Two hands close together)
    if (landmarksList.length === 2) {
        const hand1 = landmarksList[0];
        const hand2 = landmarksList[1];

        // Calculate distance between wrist of hand1 and wrist of hand2
        const dist = Math.hypot(hand1[0].x - hand2[0].x, hand1[0].y - hand2[0].y);

        // If hands are close (threshold 0.3 depending on scale), assume shake
        if (dist < 0.25) {
            return GESTURES.HAND_SHAKE;
        }
    }

    // 2. Check Single Hand Gestures (Use the first detected hand)
    const landmarks = landmarksList[0];

    // Check which fingers are extended
    const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
    const pips = [6, 10, 14, 18]; // Lower joints

    // Check thumb extension (simplified vector check)
    // distance from Index MCP [5] to Thumb Tip [4]
    const thumbDist = Math.hypot(landmarks[4].x - landmarks[5].x, landmarks[4].y - landmarks[5].y);
    const isThumbExtended = thumbDist > 0.1; // approximate threshold

    let fingersUp = isThumbExtended ? 1 : 0;

    // Check other 4 fingers
    for (let i = 0; i < 4; i++) {
        // If tip is higher (lower Y value) than PIP joint, it's extended
        if (landmarks[tips[i]].y < landmarks[pips[i]].y) {
            fingersUp++;
        }
    }

    // -- Classification --

    // Thumbs Up: Only thumb extended, others curled
    const indexDown = landmarks[8].y > landmarks[6].y;
    const middleDown = landmarks[12].y > landmarks[10].y;
    const ringDown = landmarks[16].y > landmarks[14].y;
    const pinkyDown = landmarks[20].y > landmarks[18].y;

    // Strict Thumbs Up check
    // Thumb tip above wrist [0] and other fingers down
    if (isThumbExtended && indexDown && middleDown && ringDown && pinkyDown && landmarks[4].y < landmarks[0].y) {
        return GESTURES.THUMBS_UP;
    }

    // Counts
    if (fingersUp === 0) return GESTURES.CLOSED_FIST;

    if (fingersUp === 1) {
        // If index is the one up
        if (!indexDown) return GESTURES.POINTING; // or ONE
        return GESTURES.ONE;
    }

    if (fingersUp === 2) {
        // Victory: Index and Middle
        if (!indexDown && !middleDown) {
            return GESTURES.VICTORY;
        }
    }

    if (fingersUp === 3) return GESTURES.THREE;
    if (fingersUp === 4) return GESTURES.FOUR;
    if (fingersUp === 5) return GESTURES.FIVE;

    return GESTURES.NONE;
}

// Update Expression Display
function updateGestureDisplay(gesture) {
    if (!gesture || (currentGesture && gesture.name === currentGesture.name)) {
        return;
    }

    currentGesture = gesture;

    // Update emoji with animation
    gestureEmoji.style.animation = 'none';
    setTimeout(() => {
        gestureEmoji.textContent = gesture.emoji;
        gestureEmoji.style.animation = 'bounceIn 0.5s ease';
    }, 10);

    // Update text
    gestureText.textContent = gesture.name;
}

// UI Helper Functions
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showError(message) {
    loadingOverlay.style.display = 'none';
    errorOverlay.classList.remove('hidden');
    errorText.textContent = message;
}

function hideError() {
    errorOverlay.classList.add('hidden');
}

// Retry Button Handler
retryBtn.addEventListener('click', () => {
    hideError();
    loadingOverlay.style.display = 'flex';
    init();
});

// Start the app when page loads
window.addEventListener('load', init);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (camera) camera.stop();
    } else {
        if (camera) camera.start();
    }
});
