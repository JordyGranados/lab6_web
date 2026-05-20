import { useState, useRef, useEffect, useCallback } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import './App.css'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(API_KEY)

const SYSTEM_PROMPT = `You are NEXUS, an advanced AI from the year 2077. You are brilliant, creative, and slightly futuristic in your communication style. You occasionally use technical metaphors from cyberpunk/sci-fi but remain clear and helpful. You speak with confidence and intelligence. Keep responses concise but impactful. Format code in markdown code blocks.`

const SUGGESTIONS = [
  '⚡ Explica qué es la IA',
  '🚀 Escribe un poema futurista',
  '🧠 Dame un dato curioso',
  '💻 Ejemplo de código React',
]

function formatTime(date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    return p
  })
}

function BubbleContent({ text }) {
  const blocks = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {blocks.map((block, i) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const code = block.slice(3, -3).replace(/^\w*\n/, '')
          return <pre key={i}><code>{code}</code></pre>
        }
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {block.split('\n').map((line, j, arr) => (
              <span key={j}>{renderInline(line)}{j < arr.length - 1 ? '\n' : ''}</span>
            ))}
          </span>
        )
      })}
    </>
  )
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const chatRef = useRef(null)

  useEffect(() => {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    })
    chatRef.current = model.startChat({
      history: [],
      generationConfig: { maxOutputTokens: 2048 },
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const userMsg = { role: 'user', text: trimmed, time: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const result = await chatRef.current.sendMessage(trimmed)
      const response = await result.response
      const aiText = response.text()
      setMessages(prev => [...prev, { role: 'assistant', text: aiText, time: new Date() }])
    } catch (err) {
      setError('Error de conexión con NEXUS. Verifica tu API key e inténtalo de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const clearChat = () => {
    setMessages([])
    setError('')
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    })
    chatRef.current = model.startChat({
      history: [],
      generationConfig: { maxOutputTokens: 2048 },
    })
  }

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />

      {/* Header */}
      <header className="header">
        <div>
          <div className="logo">
            <div className="logo-icon">⬡</div>
            <span className="logo-text">NEXUS</span>
          </div>
          <div className="logo-sub">Neural Exchange Unit System</div>
        </div>
        <div className="header-right">
          <span className="model-badge">GEMINI 2.5</span>
          <div className="status-dot" title="Conectado" />
          <button className="clear-btn" onClick={clearChat}>
            RESET
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 && !loading && (
          <div className="welcome">
            <div className="welcome-orb">⬡</div>
            <h2>NEXUS ONLINE</h2>
            <p>Sistema de IA avanzado activo. Inicia una conversación o elige un tema.</p>
            <div className="welcome-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className={`avatar ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
              {msg.role === 'assistant' ? '⬡' : '◈'}
            </div>
            <div className="bubble-wrap">
              <div className="bubble">
                <BubbleContent text={msg.text} />
              </div>
              <div className="bubble-actions">
                <button
                  className="bubble-action-btn"
                  onClick={() => copyText(msg.text, i)}
                >
                  {copied === i ? '✓ COPIADO' : '⎘ COPIAR'}
                </button>
              </div>
              <span className="timestamp">{formatTime(msg.time)}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="typing-row">
            <div className="avatar ai">⬡</div>
            <div className="typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        {error && <div className="error-msg">⚠ {error}</div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-wrap">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustTextarea() }}
            onKeyDown={handleKeyDown}
            placeholder="Envía un mensaje a NEXUS..."
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            title="Enviar (Enter)"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  )
}
