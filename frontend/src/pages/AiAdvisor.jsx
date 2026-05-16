import { useState } from 'react'
import { askAdvisor } from '../api/client'

const SAMPLE_QUESTIONS = [
  'What are the top 3 supply chain risks this week?',
  'Which vendors should I prioritise for emergency orders?',
  'Which materials are at risk of stockout in the next 7 days?',
  'What is driving the low perfect order rate?',
  'Which materials have the highest carrying costs?',
]

export default function AiAdvisor() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleAsk(q) {
    const text = q || question
    if (!text.trim()) return
    setLoading(true)
    setAnswer(null)
    setError(null)
    setQuestion(text)
    try {
      const res = await askAdvisor(text)
      setAnswer(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-base">✦</div>
          <div>
            <div className="text-sm font-medium text-gray-900">Supply chain AI advisor</div>
            <div className="text-xs text-gray-400">Powered by Groq + Llama 3.3 — answers from your live gold layer data</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Suggested questions
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleAsk(q)}
                className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-lg border border-gray-100 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="Ask anything about your supply chain..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 text-gray-800 placeholder-gray-300"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors font-medium"
          >
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <span className="text-sm text-gray-400">Analysing your supply chain data...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {answer && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">✦</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-gray-500">Re: {answer.question}</span>
                <span className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100">
                  {answer.model}
                </span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {answer.answer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}