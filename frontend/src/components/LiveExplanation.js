import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lightbulb, Code, Loader, Info, Zap, BookOpen, Target } from 'lucide-react';

const LiveExplanation = ({ code, language, apiBaseUrl }) => {
  const [explanations, setExplanations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [enhancedAnalysis, setEnhancedAnalysis] = useState(null);
  const [isEnhancedLoading, setIsEnhancedLoading] = useState(false);
  const [showEnhancedMode, setShowEnhancedMode] = useState(false);
  const debounceRef = useRef(null);

  // Keywords to track for explanations
  const keywordsByLanguage = {
    python: [
      'import', 'from', 'def', 'class', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally',
      'with', 'as', 'in', 'is', 'not', 'and', 'or', 'lambda', 'return', 'yield', 'pass', 'break', 'continue',
      'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool', 'None', 'True', 'False',
      'self', 'super', 'staticmethod', 'classmethod', 'property', 'decorator', 'async', 'await'
    ],
    javascript: [
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally',
      'switch', 'case', 'default', 'break', 'continue', 'return', 'yield', 'async', 'await',
      'class', 'extends', 'super', 'this', 'new', 'delete', 'typeof', 'instanceof', 'in',
      'console', 'log', 'warn', 'error', 'info', 'debug', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'document', 'window', 'localStorage', 'sessionStorage', 'JSON', 'parse', 'stringify',
      'Promise', 'resolve', 'reject', 'then', 'catch', 'finally', 'fetch', 'XMLHttpRequest'
    ],
    cpp: [
      '#include', '#define', '#ifdef', '#ifndef', '#endif', '#pragma', 'using', 'namespace',
      'int', 'float', 'double', 'char', 'bool', 'void', 'const', 'static', 'extern', 'inline',
      'class', 'struct', 'enum', 'union', 'template', 'typename', 'public', 'private', 'protected',
      'virtual', 'override', 'final', 'explicit', 'friend', 'operator', 'new', 'delete',
      'if', 'else', 'switch', 'case', 'default', 'for', 'while', 'do', 'break', 'continue',
      'return', 'try', 'catch', 'throw', 'finally', 'auto', 'decltype', 'nullptr', 'true', 'false',
      'cout', 'cin', 'endl', 'string', 'vector', 'map', 'set', 'pair', 'tuple'
    ]
  };

  // Extract keywords from code
  const extractKeywords = (code, language) => {
    const keywords = keywordsByLanguage[language] || [];
    const words = code.split(/\s+/);
    const foundKeywords = words.filter(word => 
      keywords.includes(word.replace(/[^\w]/g, ''))
    );
    return [...new Set(foundKeywords)]; // Remove duplicates
  };

  // Debounced function to get explanation
  const getExplanation = async (keyword, context) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!keyword.trim()) return;

      setIsLoading(true);
      setCurrentKeyword(keyword);

      try {
        const response = await axios.post(`${apiBaseUrl}/api/explain-keyword`, {
          keyword,
          context: context || `In ${language} programming`
        });

        const newExplanation = {
          id: Date.now(),
          keyword,
          explanation: response.data.explanation,
          timestamp: new Date().toLocaleTimeString()
        };

        setExplanations(prev => {
          // Remove existing explanation for this keyword
          const filtered = prev.filter(exp => exp.keyword !== keyword);
          return [newExplanation, ...filtered].slice(0, 10); // Keep last 10 explanations
        });
      } catch (error) {
        console.error('Error getting explanation:', error);
      } finally {
        setIsLoading(false);
        setCurrentKeyword('');
      }
    }, 1000); // 1 second debounce
  };

  // Enhanced analysis function
  const getEnhancedAnalysis = async (codeContent) => {
    if (!codeContent.trim()) return;

    setIsEnhancedLoading(true);
    try {
      const response = await axios.post(`${apiBaseUrl}/api/analyze-code`, {
        code: codeContent,
        language: language
      });

      setEnhancedAnalysis({
        id: Date.now(),
        analysis: response.data.analysis,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error getting enhanced analysis:', error);
    } finally {
      setIsEnhancedLoading(false);
    }
  };

  // Format enhanced analysis for better display
  const formatEnhancedAnalysis = (analysis) => {
    if (!analysis) return '';
    let formatted = analysis
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="analysis-link">$1</a>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    return formatted;
  };

  // Convert raw text to short bullet items for readability
  const toBulletItems = (text) => {
    if (!text) return [];
    const raw = sanitizeText(text.trim());
    // Prefer existing list lines starting with '- '
    let lines = raw.split(/\r?\n/).filter(Boolean);
    let bullets = lines.filter((l) => l.trim().startsWith('- ')).map((l) => l.replace(/^\s*-\s*/, ''));
    if (bullets.length === 0) {
      // Fallback: split into short sentences
      bullets = raw
        .replace(/\n+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean)
        .slice(0, 5);
    }
    // Trim and cap length per item
    bullets = bullets
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.length > 120 ? s.slice(0, 117) + '…' : s));
    return bullets.slice(0, 5);
  };

  // Linkify a single line for safe inner HTML
  const linkifyLine = (line) => {
    return line.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="analysis-link">$1</a>');
  };

  // Remove boilerplate phrases we don't want to show
  const sanitizeText = (text) => {
    if (!text) return '';
    let t = text;
    // Normalize curly quotes
    t = t.replace(/[’']/g, "'");
    // Remove common boilerplate lead-ins (various forms)
    t = t.replace(/\blet's break (this )?it down:?\s*/gi, '');
    t = t.replace(/\blet's break (it|this)?\s*down\b[:,-]*\s*/gi, '');
    t = t.replace(/\blet's break down\b[:,-]*\s*/gi, '');
    // Specific combined phrase often seen
    t = t.replace(/\blet's break it down:\s*the first line,?\s*/gi, '');
    // Other boilerplate phrases
    t = t.replace(/\bthe first line,?\s*/gi, '');
    t = t.replace(/\bthe code:?\s*/gi, '');
    t = t.replace(/\bwhat it does:?\s*/gi, '');
    t = t.replace(/\bhow it works:?\s*/gi, '');
    t = t.replace(/\bin summary,?\s*/gi, '');
    // Remove markdown bold section labels like **The Code:**
    t = t.replace(/\*\*[^*]+:\*\*\s*/g, '');
    return t;
  };

  // Monitor code changes for keywords
  useEffect(() => {
    if (!code.trim()) {
      setExplanations([]);
      setEnhancedAnalysis(null);
      return;
    }

    const keywords = extractKeywords(code, language);
    keywords.forEach(keyword => {
      getExplanation(keyword, `In ${language} code: ${code.substring(0, 200)}...`);
    });

    // Get enhanced analysis if mode is enabled
    if (showEnhancedMode) {
      getEnhancedAnalysis(code);
    }
  }, [code, language, showEnhancedMode]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Lightbulb className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Live Code Explanations
          </h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Get real-time explanations of programming keywords and concepts as you type. 
          The AI will automatically detect and explain keywords in your code.
        </p>
        
        {/* Enhanced Mode Toggle */}
        <div className="flex items-center justify-center space-x-4 mt-4">
          <button
            onClick={() => setShowEnhancedMode(!showEnhancedMode)}
            className={`enhanced-toggle flex items-center space-x-2 px-4 py-2 rounded-md transition-colors duration-200 ${
              showEnhancedMode
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">
              {showEnhancedMode ? 'Enhanced Mode: ON' : 'Enhanced Mode: OFF'}
            </span>
          </button>
          
          {showEnhancedMode && (
            <div className="flex items-center space-x-2">
              <span className="feature-badge">
                <BookOpen className="h-3 w-3 mr-1" />
                Concept Links
              </span>
              <span className="feature-badge">
                <Target className="h-3 w-3 mr-1" />
                Pattern Detection
              </span>
              <span className="feature-badge">
                <Info className="h-3 w-3 mr-1" />
                Why This Works
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Code Display */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Code className="h-5 w-5 text-primary-600" />
              <span>Your Code</span>
            </h2>
            
            {code ? (
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {code}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start typing code to see live explanations</p>
              </div>
            )}
          </div>

          {/* Detected Keywords */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detected Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {extractKeywords(code, language).map((keyword, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    currentKeyword === keyword
                      ? 'bg-primary-100 text-primary-800 border border-primary-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {keyword}
                </span>
              ))}
              {extractKeywords(code, language).length === 0 && (
                <span className="text-gray-500 text-sm">
                  No keywords detected yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Explanations */}
        <div className="space-y-4">
          {/* Enhanced Analysis Section */}
          {showEnhancedMode && (
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary-600" />
                  <span>Enhanced Analysis</span>
                </h2>
                <button
                  onClick={() => getEnhancedAnalysis(code)}
                  disabled={isEnhancedLoading || !code.trim()}
                  className="flex items-center space-x-2 px-3 py-1 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Target className="h-3 w-3" />
                  <span>{isEnhancedLoading ? 'Analyzing...' : 'Analyze Now'}</span>
                </button>
              </div>
              
              {isEnhancedLoading && (
                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-md">
                  <Loader className="h-4 w-4 animate-spin text-primary-600" />
                  <span className="text-sm text-blue-700">
                    Performing comprehensive analysis...
                  </span>
                </div>
              )}

              {enhancedAnalysis ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="border-l-4 border-primary-400 pl-4 bg-primary-50 rounded-r-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-700 bg-primary-200 px-2 py-1 rounded">
                        Comprehensive Analysis
                      </span>
                      <span className="text-xs text-gray-500">
                        {enhancedAnalysis.timestamp}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-700 leading-relaxed"
                    >
                      {toBulletItems(enhancedAnalysis.analysis).length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {toBulletItems(enhancedAnalysis.analysis).map((item, idx) => (
                            <li key={idx} dangerouslySetInnerHTML={{ __html: linkifyLine(item) }} />
                          ))}
                        </ul>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: formatEnhancedAnalysis(sanitizeText(enhancedAnalysis.analysis)) }} />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Enhanced analysis will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* Regular Explanations */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-primary-600" />
              <span>Live Explanations</span>
            </h2>
            
            {isLoading && (
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-md">
                <Loader className="h-4 w-4 animate-spin text-primary-600" />
                <span className="text-sm text-blue-700">
                  Analyzing "{currentKeyword}"...
                </span>
              </div>
            )}

            {/* Brief summary if provided */}
            {explanations.length > 0 && explanations[0].code_summary && (
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Summary</h4>
                <p className="text-sm text-gray-800">{explanations[0].code_summary}</p>
              </div>
            )}

            {explanations.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {explanations.map((explanation) => (
                  <div
                    key={explanation.id}
                    className="border-l-4 border-primary-200 pl-4 bg-gray-50 rounded-r-md p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded">
                        {explanation.keyword}
                      </span>
                      <span className="text-xs text-gray-500">
                        {explanation.timestamp}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-700 leading-relaxed"
                    >
                      {toBulletItems(explanation.explanation).length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {toBulletItems(explanation.explanation).map((item, idx) => (
                            <li key={idx} dangerouslySetInnerHTML={{ __html: linkifyLine(item) }} />
                          ))}
                        </ul>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: formatEnhancedAnalysis(sanitizeText(explanation.explanation)) }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Start typing code to see explanations</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span>How it works</span>
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Keywords are automatically detected as you type</li>
              <li>• Explanations appear after a brief pause in typing</li>
              <li>• Focus on common programming keywords and concepts</li>
              <li>• Explanations are contextual to your current language</li>
              {showEnhancedMode && (
                <>
                  <li>• <strong>Enhanced Mode:</strong> Includes concept links, pattern detection, and "Why This Works" analysis</li>
                  <li>• Concept links provide official docs and beginner tutorials</li>
                  <li>• Pattern detection identifies algorithms like sliding window, binary search, etc.</li>
                  <li>• "Why This Works" explains reasoning and complexity analysis</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Language-specific Keywords */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Keywords Tracked for {language.charAt(0).toUpperCase() + language.slice(1)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {(keywordsByLanguage[language] || []).map((keyword, index) => (
            <span
              key={index}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded text-center"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveExplanation; 