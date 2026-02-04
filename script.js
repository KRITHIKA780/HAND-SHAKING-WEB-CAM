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
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');

// State
let faceMesh;
let camera;
let currentExpression = null;
let expressionConfidence = 0;

// Expression Definitions
const EXPRESSIONS = {
    HAPPY: { name: 'Happy', emoji: '😊' },
    SAD: { name: 'Sad', emoji: '😢' },
    ANGRY: { name: 'Angry', emoji: '😠' },
    SURPRISED: { name: 'Surprised', emoji: '😮' },
    NEUTRAL: { name: 'Neutral', emoji: '😐' },
    DISGUSTED: { name: 'Disgusted', emoji: '🤢' },
    FEARFUL: { name: 'Fearful', emoji: '😨' },
    NONE: { name: 'Show your face', emoji: '😊' }
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

// Setup MediaPipe Face Mesh
async function setupMediaPipe() {
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);

    camera = new Camera(video, {
        onFrame: async () => {
            await faceMesh.send({ image: video });
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

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw face mesh (optional - comment out if you don't want the mesh)
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
            color: '#00f2fe20',
            lineWidth: 1
        });

        // Draw key facial features
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
            color: '#667eea',
            lineWidth: 2
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
            color: '#667eea',
            lineWidth: 2
        });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {
            color: '#f093fb',
            lineWidth: 2
        });

        // Detect expression
        const expression = detectExpression(landmarks);
        updateExpressionDisplay(expression);
    } else {
        // No face detected
        updateExpressionDisplay(EXPRESSIONS.NONE);
    }

    canvasCtx.restore();
}

// Detect facial expression from landmarks
function detectExpression(landmarks) {
    // Key landmark indices for expression detection
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];

    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];

    const leftEyebrowInner = landmarks[70];
    const leftEyebrowOuter = landmarks[46];
    const rightEyebrowInner = landmarks[300];
    const rightEyebrowOuter = landmarks[276];

    const noseTip = landmarks[1];
    const foreheadCenter = landmarks[10];

    // Calculate metrics
    const leftEyeOpenness = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeOpenness = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

    const mouthWidth = Math.abs(leftMouth.x - rightMouth.x);
    const mouthHeight = Math.abs(topLip.y - bottomLip.y);
    const mouthAspectRatio = mouthHeight / mouthWidth;

    const leftEyebrowHeight = leftEyebrowInner.y - noseTip.y;
    const rightEyebrowHeight = rightEyebrowInner.y - noseTip.y;
    const avgEyebrowHeight = (leftEyebrowHeight + rightEyebrowHeight) / 2;

    // Eyebrow angle (for anger detection)
    const leftEyebrowAngle = leftEyebrowOuter.y - leftEyebrowInner.y;
    const rightEyebrowAngle = rightEyebrowOuter.y - rightEyebrowInner.y;

    // Expression detection logic

    // HAPPY: Mouth corners up, eyes slightly closed
    if (mouthAspectRatio > 0.15 && mouthWidth > 0.15 && avgEyeOpenness < 0.03) {
        return { ...EXPRESSIONS.HAPPY, confidence: 90 };
    }

    // SURPRISED: Eyes wide open, mouth open
    if (avgEyeOpenness > 0.04 && mouthAspectRatio > 0.2) {
        return { ...EXPRESSIONS.SURPRISED, confidence: 90 };
    }

    // SAD: Mouth corners down, eyebrows down
    if (mouthAspectRatio < 0.08 && avgEyebrowHeight > -0.05) {
        return { ...EXPRESSIONS.SAD, confidence: 85 };
    }

    // ANGRY: Eyebrows furrowed (inner down, outer up), mouth tight
    if (leftEyebrowAngle < -0.01 && rightEyebrowAngle > 0.01 && mouthAspectRatio < 0.1) {
        return { ...EXPRESSIONS.ANGRY, confidence: 85 };
    }

    // DISGUSTED: Nose wrinkled, upper lip raised
    if (topLip.y < noseTip.y + 0.02 && mouthAspectRatio < 0.12) {
        return { ...EXPRESSIONS.DISGUSTED, confidence: 80 };
    }

    // FEARFUL: Eyes wide, eyebrows raised, mouth slightly open
    if (avgEyeOpenness > 0.035 && avgEyebrowHeight < -0.08 && mouthAspectRatio > 0.12) {
        return { ...EXPRESSIONS.FEARFUL, confidence: 80 };
    }

    // NEUTRAL: Default expression
    if (mouthAspectRatio < 0.15 && avgEyeOpenness > 0.02 && avgEyeOpenness < 0.04) {
        return { ...EXPRESSIONS.NEUTRAL, confidence: 75 };
    }

    // If no clear expression, return neutral with lower confidence
    return { ...EXPRESSIONS.NEUTRAL, confidence: 60 };
}

// Update Expression Display
function updateExpressionDisplay(expression) {
    if (!expression || expression.name === currentExpression) {
        return;
    }

    currentExpression = expression.name;
    expressionConfidence = expression.confidence || 0;

    // Update emoji with animation
    gestureEmoji.style.animation = 'none';
    setTimeout(() => {
        gestureEmoji.textContent = expression.emoji;
        gestureEmoji.style.animation = 'bounceIn 0.5s ease';
    }, 10);

    // Update text
    gestureText.textContent = expression.name;

    // Update confidence bar
    confidenceFill.style.width = `${expressionConfidence}%`;
    confidenceText.textContent = `Confidence: ${expressionConfidence}%`;

    // Change confidence bar color based on level
    if (expressionConfidence >= 80) {
        confidenceFill.style.background = 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)';
    } else if (expressionConfidence >= 50) {
        confidenceFill.style.background = 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';
    } else {
        confidenceFill.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
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
