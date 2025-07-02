'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Key, Settings, Sparkles, Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DocumentInfo {
  filename: string
  path: string
  size: number
  status: 'uploaded' | 'indexed'
  chunks?: number
  file_type?: string
}

// Settings interface for chunk and retrieval configuration
interface Settings {
  chunkSize: number
  chunkOverlap: number
  retrievalCount: number
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant. Provide clear, concise, and accurate responses.')
  
  // PDF-related state
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [useRAG, setUseRAG] = useState(true)
  const [vectorDBReady, setVectorDBReady] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState<Settings>({
    chunkSize: 1000,
    chunkOverlap: 200,
    retrievalCount: 3
  })
  const [showSettings, setShowSettings] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Check document status on component mount
    fetchDocumentStatus()
    // Load settings from localStorage
    loadSettings()
  }, [])

  const fetchDocumentStatus = async () => {
    try {
      const response = await fetch('/api/document-status')
      const data = await response.json()
      setDocuments(data.documents || [])
      setVectorDBReady(data.vector_db_ready || false)
    } catch (error) {
      console.error('Error fetching document status:', error)
    }
  }

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('ragChatSettings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  // Save settings to localStorage
  const saveSettings = (newSettings: Settings) => {
    try {
      localStorage.setItem('ragChatSettings', JSON.stringify(newSettings))
      setSettings(newSettings)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  // Handle settings change
  const handleSettingsChange = (field: keyof Settings, value: number) => {
    const newSettings = { ...settings, [field]: value }
    saveSettings(newSettings)
  }

  // Handle Ctrl+Enter for new lines, Enter for submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  // Auto-resize textarea based on content
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  // Handle document file upload (PDF or CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file type is supported
    const supportedTypes = ['.pdf', '.csv']
    const fileExtension = supportedTypes.find(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!fileExtension) {
      alert('Please select a PDF or CSV file')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload document')
      }

      const result = await response.json()
      await fetchDocumentStatus() // Refresh document status
      
      // Auto-index the uploaded document
      handleIndexDocument()
      
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle document indexing (PDF or CSV)
  const handleIndexDocument = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key first')
      return
    }

    setIsIndexing(true)
    
    try {
      const response = await fetch('/api/index-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          chunk_settings: {
            chunk_size: settings.chunkSize,
            chunk_overlap: settings.chunkOverlap
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to index document')
      }

      const result = await response.json()
      await fetchDocumentStatus() // Refresh document status
      
    } catch (error) {
      console.error('Error indexing document:', error)
      alert('Error indexing document. Please check your API key and try again.')
    } finally {
      setIsIndexing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !apiKey.trim()) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      // Choose endpoint based on whether we're using RAG
      const endpoint = useRAG && vectorDBReady ? '/api/rag-chat' : '/api/chat'
      const requestBody = useRAG && vectorDBReady 
        ? {
            user_message: userMessage,
            model: 'gpt-4o-mini',
            api_key: apiKey,
            use_rag: true,
            retrieval_settings: {
              k: settings.retrievalCount
            }
          }
        : {
            developer_message: developerMessage,
            user_message: userMessage,
            model: 'gpt-4o-mini',
            api_key: apiKey
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from API')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      const newAssistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, newAssistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        assistantMessage += chunk

        // Update the last message (assistant's message)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: assistantMessage
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key and try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Custom markdown components for better styling
  const markdownComponents = {
    // Style code blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return !inline ? (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto my-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      )
    },
    // Style links
    a: ({ href, children }: any) => (
      <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    // Style blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">
        {children}
      </blockquote>
    ),
    // Style lists
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside my-2 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside my-2 space-y-1">
        {children}
      </ol>
    ),
    // Style headings
    h1: ({ children }: any) => <h1 className="text-2xl font-bold my-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold my-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold my-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-bold my-2">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-sm font-bold my-2">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-xs font-bold my-2">{children}</h6>,
    // Style paragraphs
    p: ({ children }: any) => <p className="my-2">{children}</p>,
    // Style tables
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-300 dark:border-gray-600">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
        {children}
      </td>
    ),
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Document RAG Chat
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a PDF or CSV and chat with it using AI
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="API Key Settings"
            >
              <Key className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="RAG Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMessages([])}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Clear Chat"
            >
              <span className="text-sm">Clear</span>
            </button>
          </div>
        </div>
      </header>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-6xl mx-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">RAG Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Chunk Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chunk Size
                </label>
                <input
                  type="number"
                  value={settings.chunkSize}
                  onChange={(e) => handleSettingsChange('chunkSize', parseInt(e.target.value) || 1000)}
                  min="100"
                  max="4000"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Size of each text chunk (100-4000 characters)
                </p>
              </div>

              {/* Chunk Overlap */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chunk Overlap
                </label>
                <input
                  type="number"
                  value={settings.chunkOverlap}
                  onChange={(e) => handleSettingsChange('chunkOverlap', parseInt(e.target.value) || 200)}
                  min="0"
                  max={Math.floor(settings.chunkSize * 0.8)}
                  step="50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Overlap between chunks (0-{Math.floor(settings.chunkSize * 0.8)} characters)
                </p>
              </div>

              {/* Retrieval Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retrieval Count
                </label>
                <input
                  type="number"
                  value={settings.retrievalCount}
                  onChange={(e) => handleSettingsChange('retrievalCount', parseInt(e.target.value) || 3)}
                  min="1"
                  max="10"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Number of chunks to retrieve for context (1-10)
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Current Settings Effect:</h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>• Documents will be split into chunks of {settings.chunkSize} characters with {settings.chunkOverlap} characters overlap</p>
                <p>• When answering questions, {settings.retrievalCount} most relevant chunk{settings.retrievalCount > 1 ? 's' : ''} will be used as context</p>
                <p>• Re-index your document after changing chunk settings to apply them</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* PDF Upload Panel */}
        <div className="w-80 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Document Management</span>
            </h2>

            {/* Upload Section */}
            <div className="space-y-3">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Upload a PDF or CSV to start chatting with it
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                >
                  {isUploading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Choose File</span>
                    </>
                  )}
                </button>
              </div>

              {/* Document Status */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Document</h3>
                  {documents.map((doc, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.size)} • {doc.file_type?.toUpperCase() || 'PDF'}
                          </p>
                          {doc.chunks && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.chunks} chunks created
                            </p>
                          )}
                          {doc.status === 'indexed' && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Settings: {settings.chunkSize}/{settings.chunkOverlap} chars, {settings.retrievalCount} retrieved
                            </p>
                          )}
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {doc.status === 'indexed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          doc.status === 'indexed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {doc.status === 'indexed' ? 'Ready for chat' : 'Processing...'}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {documents.some(doc => doc.status === 'uploaded') && (
                    <button
                      onClick={handleIndexDocument}
                      disabled={isIndexing || !apiKey.trim()}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isIndexing ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Indexing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Index Document</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* RAG Toggle */}
              {vectorDBReady && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat Mode</h3>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useRAG"
                      checked={useRAG}
                      onChange={(e) => setUseRAG(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useRAG" className="text-sm text-gray-700 dark:text-gray-300">
                      Use document context (RAG)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, answers will be based on your uploaded document
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Welcome to Document RAG Chat
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    {vectorDBReady 
                      ? "Your document is ready! Start asking questions about it."
                      : "Upload a PDF or CSV document to start chatting with it, or chat normally with the AI assistant."
                    }
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div
                        className={`text-xs mt-2 ${
                          message.role === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Form */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={vectorDBReady && useRAG 
                      ? "Ask a question about your document... (Ctrl+Enter for new line, Enter to send)"
                      : "Type your message... (Ctrl+Enter for new line, Enter to send)"
                    }
                    disabled={isLoading || !apiKey.trim()}
                    rows={1}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none overflow-hidden"
                    style={{ minHeight: '48px', maxHeight: '200px' }}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    Ctrl+Enter
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim() || !apiKey.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
              
              {!apiKey.trim() && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Please enter your OpenAI API key to start chatting.
                </p>
              )}
              
              {vectorDBReady && useRAG && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  RAG mode: Answers will be based on your uploaded document.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 