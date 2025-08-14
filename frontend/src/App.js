import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Code, MessageCircle, Play, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import ResultBox from './components/ResultBox';
import QuestionBox from './components/QuestionBox';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [executionResult, setExecutionResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [errorExplanation, setErrorExplanation] = useState(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [liveExplanations, setLiveExplanations] = useState([]);
  const [isLoadingLiveExplanation, setIsLoadingLiveExplanation] = useState(false);
  const [conceptualQuestion, setConceptualQuestion] = useState('');
  const [conceptualAnswer, setConceptualAnswer] = useState('');
  const [isLoadingConceptualAnswer, setIsLoadingConceptualAnswer] = useState(false);
  const [docLinks, setDocLinks] = useState([]);
  const [activeTab, setActiveTab] = useState('analysis');
  const [codeSummary, setCodeSummary] = useState('');
  const [keyConcepts, setKeyConcepts] = useState([]);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [disabledFollowUp, setDisabledFollowUp] = useState('');
  const [clientId] = useState(() => `vta_${Date.now()}_${Math.floor(Math.random()*1e6)}`);

  // Fetch supported languages on component mount
  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/languages`);
      setLanguages(response.data);
      if (response.data.length > 0) {
        setSelectedLanguage(response.data[0].name);
        setCode(response.data[0].template);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
    }
  };

  const executeCode = async () => {
    if (!code.trim()) {
      setExecutionResult({
        success: false,
        output: null,
        error: 'Please enter some code to execute.'
      });
      return;
    }

    setIsExecuting(true);
    setErrorExplanation(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/execute`, {
        code,
        language: selectedLanguage
      });

      setExecutionResult(response.data);
    } catch (error) {
      setExecutionResult({
        success: false,
        output: null,
        error: error.response?.data?.error || 'Failed to execute code'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const solveError = async () => {
    if (!executionResult?.error) return;

    setIsLoadingExplanation(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/solve-error`, {
        error: executionResult.error,
        code,
        language: selectedLanguage
      });

      setErrorExplanation(response.data.explanation);
      setDocLinks((response.data.inline_doc_links || []).slice(0, 15));
      setCodeSummary(response.data.code_summary || '');
      setKeyConcepts((response.data.key_concepts || []).slice(0, 10));
      // Do not redirect tabs
    } catch (error) {
      setErrorExplanation('Failed to get error explanation. Please try again.');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setExecutionResult(null);
    setErrorExplanation(null);
    
    // Set default template for the selected language
    const langConfig = languages.find(lang => lang.name === language);
    if (langConfig) {
      setCode(langConfig.template);
    }
  };

  // Live explanation functionality
  const getLiveExplanation = async (codeContent) => {
    if (!codeContent.trim()) return;

    setIsLoadingLiveExplanation(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/explain-code`, {
        code: codeContent,
        language: selectedLanguage
      });

      const newExplanation = {
        id: Date.now(),
        code: codeContent.substring(0, 100) + (codeContent.length > 100 ? '...' : ''),
        explanation: response.data.explanation,
        timestamp: new Date().toLocaleTimeString(),
        code_summary: response.data.code_summary || ''
      };
      setDocLinks((response.data.inline_doc_links || []).slice(0, 15));
      setCodeSummary(response.data.code_summary || '');
      setKeyConcepts((response.data.key_concepts || []).slice(0, 10));

      setLiveExplanations(prev => {
        // Keep only the latest explanation
        return [newExplanation];
      });
      // Generate initial follow-up questions only when there is no prior question context
      triggerFollowUps({ code: codeContent, useCode: true });
    } catch (error) {
      console.error('Error getting live explanation:', error);
    } finally {
      setIsLoadingLiveExplanation(false);
    }
  };

  // Debounced live explanation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (code.trim()) {
        getLiveExplanation(code);
      } else {
        setLiveExplanations([]);
      }
    }, 2000); // 2 second debounce for code analysis

    return () => clearTimeout(timeoutId);
  }, [code, selectedLanguage]);

  // Convert raw text to short bullet items for readability
  const toBulletItems = (text) => {
    if (!text) return [];
    const raw = text.trim();
    let lines = raw.split(/\r?\n/).filter(Boolean);
    let bullets = lines.filter((l) => l.trim().startsWith('- ')).map((l) => l.replace(/^\s*-\s*/, ''));
    if (bullets.length === 0) {
      bullets = raw
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 5);
    }
    bullets = bullets
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.length > 120 ? s.slice(0, 117) + '…' : s));
    return bullets.slice(0, 5);
  };

  const linkifyLine = (line) => {
    return line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="analysis-link">$1</a>');
  };


  const askConceptualQuestion = async () => {
    if (!conceptualQuestion.trim()) return;

    setIsLoadingConceptualAnswer(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ask-question`, {
        question: conceptualQuestion,
        clientId
      });

      setConceptualAnswer(response.data.answer);
      // Regenerate follow-ups based on last Q/A context
      triggerFollowUps({ code: '', useCode: false });
    } catch (error) {
      setConceptualAnswer('Failed to get answer. Please try again.');
    } finally {
      setIsLoadingConceptualAnswer(false);
    }
  };

  // Ask arbitrary question (used for follow-up clicks)
  const askArbitraryQuestion = async (questionText) => {
    if (!questionText || !questionText.trim()) return;
    setDisabledFollowUp(questionText);
    setIsLoadingConceptualAnswer(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ask-question`, {
        question: questionText,
        clientId
      });
      setConceptualAnswer(response.data.answer);
      // Regenerate follow-ups based on last Q/A context
      triggerFollowUps({ code: '', useCode: false });
    } catch (error) {
      setConceptualAnswer('Failed to get answer. Please try again.');
    } finally {
      setIsLoadingConceptualAnswer(false);
      setDisabledFollowUp('');
    }
  };

  const triggerFollowUps = async ({ code, useCode }) => {
    try {
      setIsLoadingFollowUps(true);
      const payload = { clientId };
      if (useCode) {
        payload.code = code || '';
        payload.language = selectedLanguage;
      }
      const resp = await axios.post(`${API_BASE_URL}/api/follow-ups`, payload);
      setFollowUpQuestions(Array.isArray(resp.data.follow_up_questions) ? resp.data.follow_up_questions : []);
    } catch (e) {
      setFollowUpQuestions([]);
    } finally {
      setIsLoadingFollowUps(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                Virtual Teaching Assistant
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Interactive Learning Platform
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sections are displayed on one page below, no tabs */}
        <div className="mb-4" />

        {/* Code + Live Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Code Editor Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <Code className="h-5 w-5 text-primary-600" />
                  <span>Code Editor</span>
                </h2>
                <div className="flex items-center space-x-4">
                  {/* Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.name} value={lang.name}>
                        {lang.displayName}
                      </option>
                    ))}
                  </select>

                  {/* Run Button */}
                  <button
                    onClick={executeCode}
                    disabled={isExecuting}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isExecuting ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
                  </button>
                </div>
              </div>

              <CodeEditor
                code={code}
                setCode={setCode}
                language={selectedLanguage}
                executionResult={executionResult}
              />
            </div>

            {/* Live Explanation Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-primary-600" />
                <span>Live Code Analysis</span>
              </h2>
              
              <div className="bg-white rounded-lg border border-gray-300 p-6 h-96 overflow-y-auto">
                {isLoadingLiveExplanation && (
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-md mb-4">
                    <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full" />
                    <span className="text-sm text-blue-700">
                      Analyzing your code...
                    </span>
                  </div>
                )}

                {liveExplanations.length > 0 ? (
                  <div className="space-y-4">
                    {liveExplanations.map((explanation) => (
                      <div
                        key={explanation.id}
                        className="border-l-4 border-primary-200 pl-4 bg-gray-50 rounded-r-md p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded">
                            Code Analysis
                          </span>
                          <span className="text-xs text-gray-500">
                            {explanation.timestamp}
                          </span>
                        </div>
                        {/* code snippet hidden intentionally */}
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {toBulletItems(explanation.explanation).length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {toBulletItems(explanation.explanation).map((item, idx) => (
                                <li key={idx} dangerouslySetInnerHTML={{ __html: linkifyLine(item) }} />
                              ))}
                            </ul>
                          ) : (
                            <p>{explanation.explanation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Start typing code to see live analysis</p>
                  </div>
                )}
              </div>

              {/* Suggested Follow-Up Questions */}
              {followUpQuestions.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Suggested Follow-Up Questions</h3>
                    {isLoadingFollowUps && (
                      <span className="text-xs text-gray-500">Updating…</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {followUpQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => askArbitraryQuestion(q)}
                        disabled={disabledFollowUp === q}
                        className={`px-3 py-1 text-xs rounded-full border transition ${disabledFollowUp === q ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-primary-50 text-primary-800 border-primary-200 hover:bg-primary-100'}`}
                        title={q}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Execution Results Section */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Execution Results
            </h2>
            <ResultBox
              result={executionResult}
              onSolveError={solveError}
              isLoadingExplanation={isLoadingExplanation}
              errorExplanation={errorExplanation}
            />
        </div>

        {/* Conceptual Questions Section */}
        <div className="bg-white rounded-lg border border-gray-300 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <HelpCircle className="h-5 w-5 text-primary-600" />
              <span>Conceptual Questions</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={conceptualQuestion}
                  onChange={(e) => setConceptualQuestion(e.target.value)}
                  placeholder="Ask a programming question (e.g., 'How to think about reversing a string?')"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && askConceptualQuestion()}
                />
                <button
                  onClick={askConceptualQuestion}
                  disabled={isLoadingConceptualAnswer || !conceptualQuestion.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoadingConceptualAnswer ? 'Analyzing...' : 'Get Guidance'}
                </button>
              </div>

              {conceptualAnswer && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Conceptual Guidance:</h3>
                  <div className="text-lg text-blue-900 leading-relaxed bg-gray-100 rounded p-4 whitespace-pre-line">
                    {conceptualAnswer}
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Docs Section */}
        <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary-600" />
              <span>Docs</span>
            </h2>
            {docLinks && docLinks.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {docLinks.slice(0, 15).map((item, idx) => (
                  <li key={idx} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">📄</span>
                      <span className="text-sm font-medium text-gray-800">{item.term}</span>
                    </div>
                    <a
                      href={item.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 underline"
                    >
                      Open Documentation
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">No documentation links detected for this code.</p>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Key Concepts</h3>
              {keyConcepts && keyConcepts.length > 0 ? (
                <ul className="space-y-2">
                  {keyConcepts.map((c, idx) => (
                    <li key={idx} className="text-sm text-gray-800 flex items-center justify-between">
                      <span>
                        <span className="mr-2">📌</span>
                        <span className="font-medium">{c.name}</span> — {c.description}
                      </span>
                      {c.link && (
                        <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline ml-2">
                          Open Resource
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No key concepts identified for this code.</p>
              )}
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>Virtual Teaching Assistant - Interactive Learning Platform</p>
            <p className="mt-2 text-sm">
              Powered by Groq AI • Safe Code Execution • Conceptual Guidance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 