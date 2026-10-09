
import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const languages = [
  'English',
  'Telugu',
  'Hindi',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Urdu',
  'French',
  'Spanish',
  'German',
  'Portuguese',
  'Italian',
  'Japanese',
  'Korean',
  'Chinese',
  'Arabic',
  'Russian',
]

function Icon({ name, size = 20 }) {
  const paths = {
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    translate: <><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M12 19l5-12 5 12M14 15h6" /></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function App() {
  const [text, setText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('Telugu')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('translation_history') || '[]',
      )
      if (Array.isArray(saved)) setHistory(saved)
    } catch {
      localStorage.removeItem('translation_history')
    }
  }, [])

  const saveHistory = (items) => {
    setHistory(items)
    try {
      localStorage.setItem('translation_history', JSON.stringify(items))
    } catch {
      setNotice('Translation completed, but browser history could not be saved.')
    }
  }

  const handleTranslate = async () => {
    const trimmedText = text.trim()

    if (!trimmedText) {
      setError('Enter some text before translating.')
      return
    }

    setLoading(true)
    setError('')
    setNotice('')
    setCopied(false)

    try {
      const response = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText,
          target_language: targetLanguage,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('The server returned an invalid response.')
      }

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || `Translation failed (${response.status}).`,
        )
      }

      const translatedText = (
        data.translation || data.translated_text || data.result || ''
      ).trim()

      if (!translatedText) {
        throw new Error('The AI returned an empty translation. Try again.')
      }

      setTranslation(translatedText)

      const newItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source: trimmedText,
        target: targetLanguage,
        translation: translatedText,
        date: new Date().toLocaleString(),
      }

      saveHistory([
        newItem,
        ...history.filter(
          (item) =>
            !(item.source === trimmedText &&
              item.target === targetLanguage &&
              item.translation === translatedText),
        ),
      ].slice(0, 30))
    } catch (err) {
      setError(
        err.message?.includes('Failed to fetch')
          ? 'Cannot reach the translation server. Make sure the backend is running.'
          : err.message || 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!translation) return

    try {
      await navigator.clipboard.writeText(translation)
      setCopied(true)
      setNotice('Translation copied to clipboard.')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy automatically. Select the translation and copy it manually.')
    }
  }

  const openHistoryItem = (item) => {
    setText(item.source)
    setTargetLanguage(item.target)
    setTranslation(item.translation)
    setError('')
    setNotice('Previous translation loaded.')
    setCopied(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearHistory = () => {
    if (!history.length) return
    saveHistory([])
    setNotice('Translation history cleared.')
  }

  const clearEditor = () => {
    setText('')
    setTranslation('')
    setError('')
    setNotice('')
    setCopied(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Lingua AI home">
          <span className="brand-mark"><Icon name="globe" size={25} /></span>
          <span className="brand-copy">
            <strong>lingua<span>AI</span></strong>
            <small>TRANSLATION STUDIO</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>
        <a className="nav-item active" href="#translator">
          <Icon name="translate" />
          <span>Translator</span>
          <span className="nav-dot" />
        </a>
        <a className="nav-item" href="#history">
          <Icon name="history" />
          <span>Recent translations</span>
        </a>

        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <span className="promo-icon"><Icon name="sparkles" size={21} /></span>
            <h3>Words connect worlds.</h3>
            <p>Translate your thoughts and make every conversation count.</p>
          </div>
          <div className="connection-status">
            <span className="status-indicator" />
            <span>Translation workspace</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Translator</div>
          <div className="topbar-right">
            <span className="secure-label"><span className="secure-dot" /> AI powered</span>
            <div className="avatar">L</div>
          </div>
        </header>

        <div className="page-content" id="translator">
          <section className="welcome-section">
            <div className="eyebrow"><Icon name="sparkles" size={15} /> YOUR PERSONAL LANGUAGE ASSISTANT</div>
            <h1>Say it in <span>any language.</span></h1>
            <p>Clear, natural translations to help your words travel further.</p>
          </section>

          <section className="translator-card">
            <div className="translator-card-header">
              <div className="card-heading">
                <span className="heading-icon"><Icon name="translate" size={19} /></span>
                <div>
                  <h2>Text translator</h2>
                  <p>Enter your message and choose your target language.</p>
                </div>
              </div>
              <span className="ai-pill"><Icon name="sparkles" size={13} /> GEMINI AI</span>
            </div>

            <div className="language-bar">
              <div className="language-block">
                <span className="field-label">FROM</span>
                <div className="language-name"><Icon name="globe" size={18} /> Detect from text</div>
              </div>
              <div className="language-connector"><Icon name="arrow" size={19} /></div>
              <div className="language-block target-language">
                <label className="field-label" htmlFor="target-language">TRANSLATE TO</label>
                <div className="select-wrap">
                  <select
                    id="target-language"
                    value={targetLanguage}
                    onChange={(event) => {
                      setTargetLanguage(event.target.value)
                      setError('')
                    }}
                  >
                    {languages.map((language) => (
                      <option key={language} value={language}>{language}</option>
                    ))}
                  </select>
                  <span className="select-chevron">âŒ„</span>
                </div>
              </div>
            </div>

            <div className="editor-grid">
              <div className="editor-panel input-panel">
                <div className="panel-topline">
                  <label htmlFor="source-text">Your text</label>
                  <span className="panel-tag">INPUT</span>
                </div>
                <textarea
                  id="source-text"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value)
                    setError('')
                    setNotice('')
                  }}
                  placeholder="Type or paste something you want to translate..."
                  maxLength={10000}
                  spellCheck="true"
                />
                <div className="panel-footer">
                  <span>{text.length.toLocaleString()} / 10,000 characters</span>
                  <button className="text-action" onClick={clearEditor} disabled={!text && !translation}>
                    Clear text
                  </button>
                </div>
              </div>

              <div className="editor-panel output-panel">
                <div className="panel-topline">
                  <span className="output-title">Translation</span>
                  <span className="panel-tag output-tag">OUTPUT</span>
                </div>
                <div className={`translation-output ${translation ? 'has-translation' : ''}`} aria-live="polite">
                  {loading ? (
                    <div className="loading-state">
                      <span className="loading-spinner" />
                      <strong>Translating your text</strong>
                      <span>Finding the right words...</span>
                    </div>
                  ) : translation ? (
                    <p>{translation}</p>
                  ) : (
                    <div className="placeholder-state">
                      <span className="placeholder-icon"><Icon name="message" size={25} /></span>
                      <strong>Your translation will appear here</strong>
                      <span>Your translated text will be ready in a moment.</span>
                    </div>
                  )}
                </div>
                <div className="panel-footer output-footer">
                  <span>{translation ? `${translation.length.toLocaleString()} characters` : 'Ready when you are'}</span>
                  <button className="copy-action" onClick={handleCopy} disabled={!translation || loading}>
                    <Icon name={copied ? 'check' : 'copy'} size={15} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {error && <div className="feedback error-feedback" role="alert"><span>!</span>{error}</div>}
            {notice && !error && <div className="feedback notice-feedback" role="status"><Icon name="check" size={16} />{notice}</div>}

            <div className="translate-action-row">
              <span className="privacy-note"><Icon name="check" size={15} /> Your text is sent to AI for translation.</span>
              <button
                className="translate-button"
                onClick={handleTranslate}
                disabled={loading || !text.trim()}
              >
                {loading ? <><span className="button-spinner" /> Translating...</> : <><Icon name="sparkles" size={18} /> Translate text <Icon name="arrow" size={17} /></>}
              </button>
            </div>
          </section>

          <section className="history-section" id="history">
            <div className="history-heading">
              <div>
                <div className="section-kicker"><Icon name="clock" size={15} /> YOUR ACTIVITY</div>
                <h2>Recent translations <span className="history-count">{history.length}</span></h2>
                <p>Pick up where you left off.</p>
              </div>
              {history.length > 0 && (
                <button className="clear-history-button" onClick={clearHistory}>
                  <Icon name="trash" size={16} /> Clear history
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="empty-history">
                <span className="empty-history-icon"><Icon name="history" size={24} /></span>
                <strong>No translations yet</strong>
                <p>Your completed translations will appear here.</p>
              </div>
            ) : (
              <div className="history-grid">
                {history.slice(0, 6).map((item) => (
                  <button
                    className="history-card"
                    key={item.id}
                    onClick={() => openHistoryItem(item)}
                  >
                    <div className="history-card-top">
                      <span className="history-language"><Icon name="globe" size={14} /> {item.target}</span>
                      <span className="history-open"><Icon name="arrow" size={15} /></span>
                    </div>
                    <p className="history-source">{item.source}</p>
                    <p className="history-translation">{item.translation}</p>
                    <span className="history-date">{item.date}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span><span className="footer-brand">linguaAI</span> Â· Your words, understood.</span>
            <span>Powered by AI translation</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
