'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Key, Settings, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant. Provide clear, concise, and accurate responses.')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !apiKey.trim()) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    // Add user message to chat
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: userMessage,
          model: 'gpt-4.1-mini',
          api_key: apiKey
        }),
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                AI Engineer Challenge
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by OpenAI GPT-4.1-mini
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
              onClick={() => setMessages([])}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Clear Chat"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to AI Engineer Challenge
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Start a conversation with the AI assistant. Make sure to enter your OpenAI API key in the settings above.
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
                  <div className="whitespace-pre-wrap">{message.content}</div>
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
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading || !apiKey.trim()}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
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
        </div>
      </div>
    </div>
  )
} 