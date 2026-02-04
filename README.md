# Facial Expression Recognition Web App

A real-time facial expression recognition application powered by AI that detects emotions from your webcam and displays them as text labels.

## 🚀 Features

- **Real-time Detection**: Instant emotion recognition using MediaPipe Face Mesh
- **7 Expression Types**: Happy, sad, angry, surprised, neutral, disgusted, fearful
- **Modern UI**: Vibrant gradients, glassmorphic design, smooth animations
- **Confidence Scoring**: Visual feedback showing detection accuracy
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Face Mesh Visualization**: Draws facial landmarks overlay on camera feed

## 🎯 How to Use

### Quick Start

1. **Start the local server:**
   ```bash
   python -m http.server 8080
   ```

2. **Open in browser:**
   ```
   http://localhost:8080
   ```

3. **Allow camera permissions** when prompted

4. **Show your emotions** and watch them get detected instantly!

### Supported Expressions

| Expression | Emoji | How to Show |
|------------|-------|-------------|
| Happy | 😊 | Smile with your mouth and eyes |
| Sad | 😢 | Frown, look down |
| Angry | 😠 | Furrow eyebrows, tighten mouth |
| Surprised | 😮 | Open eyes wide, open mouth |
| Neutral | 😐 | Relaxed face, no expression |
| Disgusted | 🤢 | Wrinkle nose, raise upper lip |
| Fearful | 😨 | Widen eyes, raise eyebrows |

## 📁 Project Structure

```
hand-gesture-app/
├── index.html    # Main HTML structure
├── style.css     # Styling and design system
├── script.js     # Expression detection logic
└── README.md     # This file
```

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **AI Library**: MediaPipe Face Mesh (via CDN)
- **APIs**: Camera API, Canvas API
- **Fonts**: Inter, Space Grotesk (Google Fonts)

## 🌐 Browser Support

- ✅ Chrome/Edge (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ❌ Internet Explorer (not supported)

## 💡 Tips for Best Results

- **Lighting**: Use well-lit environment
- **Position**: Face the camera directly
- **Distance**: Keep face 1-2 feet from camera
- **Expression**: Make clear, exaggerated expressions

## 🐛 Troubleshooting

**Camera not working?**
- Check browser permissions
- Close other apps using camera
- Try different browser

**Expressions not detected?**
- Improve lighting
- Face camera directly
- Make expressions more pronounced
- Check confidence score (aim for >80%)

## 📝 License

This project is open source and available for personal and educational use.

## 🙏 Credits

- **MediaPipe Face Mesh**: Google's face tracking solution
- **Design Inspiration**: Modern web design trends
- **Fonts**: Google Fonts

---

Built with ❤️ using AI-powered facial expression recognition
