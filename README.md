# Virtual Teaching Assistant

A comprehensive full-stack web application that provides an interactive learning environment for programming with AI-powered assistance.

## 🚀 Features

### 🧩 Multi-language Code Editor
- **Language Support**: Python, JavaScript, C++
- **Syntax Highlighting**: Powered by Monaco Editor
- **Line Numbers**: Professional code editor experience
- **Run Code**: Execute code safely with timeout protection

### 📦 Result Box
- **Output Display**: Shows code execution results
- **Error Handling**: Displays detailed error messages
- **Solve Error**: AI-powered error explanation and solutions
- **Real-time Feedback**: Immediate execution status

### 💬 Question Box
- **Conceptual Questions**: Ask about programming concepts
- **AI Responses**: Get instant answers from LLM
- **Example Questions**: Pre-built question templates
- **Conversation History**: Track your learning progress

### 🧠 Live Code Analysis
- **Real-time Analysis**: Explains your code as you type
- **Language-specific**: Contextual explanations for each language
- **Debounced Requests**: Smart API calls to prevent spam
- **Dynamic Content**: Analyzes the actual code you're writing

### 🤖 LLM Integration
- **Groq API Integration**: Powered by LLaMA 3 70B model
- **Error Analysis**: Explains errors and provides solutions
- **Conceptual Help**: Answers programming questions
- **Live Explanations**: Real-time keyword explanations

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Monaco Editor**: Professional code editor
- **Lucide React**: Beautiful icons
- **Axios**: HTTP client for API calls

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **Groq API**: LLM integration (LLaMA 3 70B)
- **VM2**: Safe code execution sandbox
- **CORS**: Cross-origin resource sharing

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python (for Python code execution)
- C++ compiler (for C++ code execution)
- Groq API key

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd virtual-teaching-assistant
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file:
```bash
cp env.example .env
```

Edit `.env` and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server Configuration
PORT=5000

# Groq API Configuration
GROQ_API_KEY=your_groq_api_key_here

# Optional: Customize LLM settings
GROQ_MODEL=llama3-70b-8192
MAX_TOKENS=500
TEMPERATURE=0.7

# Code Execution Settings
EXECUTION_TIMEOUT=5000
MAX_CODE_SIZE=10000
```

### Language Support

The application supports three programming languages:

1. **Python**
   - Command: `python`
   - Extension: `.py`
   - Template: Basic Python structure

2. **JavaScript**
   - Command: `node`
   - Extension: `.js`
   - Template: Basic JavaScript structure

3. **C++**
   - Command: `g++`
   - Extension: `.cpp`
   - Template: Complete C++ main function

## 🎯 Usage Guide

### Code Editor Tab
1. Select your programming language
2. Write or paste your code
3. Click "Run Code" to execute
4. View results in the Result Box
5. Use "Solve Error" for AI-powered error explanations

### Live Code Analysis
1. Type code in the editor
2. Code is automatically analyzed
3. Real-time explanations appear
4. Learn as you code

### Ask Questions Tab
1. Type your programming question
2. Click "Ask Question" or use example questions
3. Get instant AI-powered answers
4. View conversation history

## 🔒 Security Features

- **Code Execution Timeout**: 5-second limit per execution
- **Sandboxed Execution**: Isolated code execution environment
- **Input Validation**: Sanitized code inputs
- **Error Handling**: Comprehensive error management
- **CORS Protection**: Secure cross-origin requests

## 🐛 Troubleshooting

### Common Issues

1. **Code Execution Fails**
   - Ensure Python/Node.js/C++ compiler is installed
   - Check if the language is properly configured
   - Verify code syntax

2. **LLM Integration Not Working**
   - Verify Groq API key is set correctly
   - Check API key permissions
   - Ensure internet connection

3. **Frontend Not Loading**
   - Check if backend is running on port 5000
   - Verify proxy configuration in package.json
   - Clear browser cache

4. **Monaco Editor Issues**
   - Ensure all dependencies are installed
   - Check browser console for errors
   - Try refreshing the page

### Development Tips

- Use `npm run dev` for backend development with auto-restart
- Frontend auto-reloads on file changes
- Check browser console for frontend errors
- Monitor backend logs for API issues

## 📁 Project Structure

```
virtual-teaching-assistant/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Backend dependencies
│   ├── env.example           # Environment variables template
│   └── temp/                 # Temporary code execution files
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── CodeEditor.js
│   │   │   ├── ResultBox.js
│   │   │   ├── QuestionBox.js
│   │   │   └── LiveExplanation.js
│   │   ├── App.js           # Main React app
│   │   ├── index.js         # React entry point
│   │   └── index.css        # Global styles
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
└── README.md               # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Groq](https://groq.com/) for LLM integration
- [Lucide](https://lucide.dev/) for icons

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation

---

**Happy Coding! 🚀** 