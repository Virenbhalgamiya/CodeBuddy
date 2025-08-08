# Quick Setup Guide - Virtual Teaching Assistant

## 🚀 Quick Start (Windows)

1. **Double-click `start.bat`** in the project root directory
   - This will automatically install dependencies and start both servers
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3000

## 🔧 Manual Setup

### Prerequisites
- Node.js (v16 or higher)
- Python (for Python code execution)
- C++ compiler (for C++ code execution)
- Groq API key

### Step 1: Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```bash
cp env.example .env
```

Edit `.env` and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

### Step 2: Frontend Setup
```bash
cd frontend
npm install
```

### Step 3: Start the Application

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

## 🎯 Features Overview

### Code Editor Tab
- Write code in Python, JavaScript, or C++
- Syntax highlighting and line numbers
- Click "Run Code" to execute
- View results and errors in real-time

### Live Explanation Tab
- Type code and get real-time keyword explanations
- AI-powered explanations as you code
- Language-specific context

### Ask Questions Tab
- Ask programming questions
- Get instant AI responses
- Browse example questions
- View conversation history

## 🔑 Getting Groq API Key

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
# Reinstall dependencies
cd backend && npm install
cd ../frontend && npm install
```

**Backend not starting:**
- Check if port 5000 is available
- Verify `.env` file exists with API key
- Ensure Python/Node.js are installed

**Frontend not loading:**
- Check if backend is running on port 5000
- Clear browser cache
- Check browser console for errors

**Code execution fails:**
- Ensure Python is installed for Python code
- Ensure C++ compiler is installed for C++ code
- Check code syntax

## 📞 Need Help?

- Check the main README.md for detailed documentation
- Review the troubleshooting section
- Ensure all prerequisites are installed

---

**Happy Learning! 🚀** 