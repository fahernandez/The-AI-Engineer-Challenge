# 🚀 How to Launch This Application Locally

Welcome to the AI Engineer Challenge! This guide will walk you through launching both the frontend and backend components of your application locally.

## 📋 Prerequisites

Before you start, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://python.org/)
- **Git** - [Download here](https://git-scm.com/)
- **OpenAI API Key** - Get one from [OpenAI Platform](https://platform.openai.com/api-keys)

## 🏗️ Project Structure

```
The-AI-Engineer-Challenge/
├── frontend/          # Next.js frontend application
├── api/              # FastAPI backend application
└── README.md         # Main project documentation
```

## 🔧 Step 1: Backend Setup (FastAPI)

The backend is a FastAPI application that handles chat requests to OpenAI's API.

### 1.1 Navigate to the API directory
```bash
cd api
```

### 1.2 Create a Python virtual environment (recommended)
```bash
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### 1.3 Install Python dependencies
```bash
pip install -r requirements.txt
```

### 1.4 Set up your OpenAI API key
You'll need to set your OpenAI API key as an environment variable:

```bash
# On macOS/Linux
export OPENAI_API_KEY="your-api-key-here"

# On Windows
set OPENAI_API_KEY=your-api-key-here
```

### 1.5 Launch the backend server
```bash
# Option 1: Using uvicorn directly
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Option 2: Using Python
python app.py
```

The backend will be available at: **http://localhost:8000**

### 1.6 Test the backend
You can test if the backend is running by visiting:
- Health check: http://localhost:8000/api/health
- API documentation: http://localhost:8000/docs

## 🎨 Step 2: Frontend Setup (Next.js)

The frontend is a Next.js application that provides the user interface.

### 2.1 Navigate to the frontend directory
```bash
cd frontend
```

### 2.2 Install Node.js dependencies
```bash
npm install
```

### 2.3 Launch the frontend development server
```bash
npm run dev
```

The frontend will be available at: **http://localhost:3000**

## 🌐 Step 3: Using Your Application

1. **Open your browser** and go to `http://localhost:3000`
2. **Enter your OpenAI API key** in the application interface
3. **Start chatting!** The frontend will communicate with your local backend

## 🔄 Development Workflow

### Running Both Services

You'll need to run both services simultaneously. Here's how:

1. **Terminal 1** - Backend:
   ```bash
   cd api
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Terminal 2** - Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

### Making Changes

- **Frontend changes** will automatically reload thanks to Next.js hot reloading
- **Backend changes** will automatically reload thanks to uvicorn's `--reload` flag

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Backend: Change port in the uvicorn command: `--port 8001`
   - Frontend: Next.js will automatically try the next available port

2. **API key not working**
   - Make sure your OpenAI API key is valid and has credits
   - Check that the environment variable is set correctly

3. **CORS errors**
   - The backend is already configured with CORS middleware
   - If you change ports, make sure the frontend is pointing to the correct backend URL

4. **Module not found errors**
   - Backend: Make sure you're in the virtual environment and have run `pip install -r requirements.txt`
   - Frontend: Make sure you've run `npm install`

### Getting Help

If you encounter any issues:
1. Check the terminal output for error messages
2. Make sure all prerequisites are installed
3. Verify your OpenAI API key is valid
4. Check that both services are running on the correct ports

## 🎉 You're All Set!

Your AI Engineer Challenge application is now running locally! You can:
- Build and test new features
- Experiment with different prompts
- Customize the UI and functionality
- Deploy to Vercel when ready

Happy coding! 🚀 