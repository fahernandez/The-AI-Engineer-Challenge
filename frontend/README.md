# AI Engineer Challenge Frontend

A modern, responsive chat interface built with Next.js, TypeScript, and Tailwind CSS that integrates with the FastAPI backend to provide a seamless AI chat experience.

## Features

- 🎨 **Modern UI/UX**: Beautiful gradient design with dark mode support
- 💬 **Real-time Chat**: Streaming responses from OpenAI GPT-4.1-mini
- 🔐 **Secure API Key Management**: Local storage with password input
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- ⚡ **Fast Performance**: Built with Next.js 14 and optimized for speed
- 🎯 **TypeScript**: Full type safety and better developer experience

## Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- FastAPI backend running (see `/api/README.md`)

## Quick Start

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm run dev
   ```

3. **Open Your Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Enter Your API Key**
   Click the key icon in the header and enter your OpenAI API key

5. **Start Chatting!**
   Type your message and press Enter or click Send

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
frontend/
├── app/                 # Next.js 14 app directory
│   ├── globals.css     # Global styles and Tailwind
│   ├── layout.tsx      # Root layout component
│   └── page.tsx        # Main chat interface
├── lib/                # Utility functions
│   └── utils.ts        # Helper functions
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
└── next.config.js      # Next.js configuration
```

### Key Components

- **Chat Interface**: Real-time messaging with streaming responses
- **API Key Management**: Secure input with password field
- **Message History**: Persistent chat history with timestamps
- **Loading States**: Smooth animations and loading indicators
- **Error Handling**: Graceful error messages and recovery

## Deployment

This frontend is optimized for deployment on Vercel:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Configure Environment**
   - Set up your FastAPI backend URL in production
   - Update CORS settings if needed

## Backend Integration

The frontend communicates with the FastAPI backend at `/api/chat` endpoint. Make sure your backend is running on `http://localhost:8000` for local development.

## Styling

Built with Tailwind CSS using a custom design system with:
- CSS custom properties for theming
- Dark mode support
- Responsive breakpoints
- Smooth animations and transitions

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AI Engineer Challenge.