import React, { useState } from 'react';
import axios from 'axios';
import { MessageCircle, Send, Loader, BookOpen, Lightbulb } from 'lucide-react';

const QuestionBox = ({ apiBaseUrl }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const exampleQuestions = [
    "What is list comprehension in Python?",
    "How does recursion work?",
    "What's the difference between let, const, and var in JavaScript?",
    "Explain object-oriented programming concepts",
    "What are closures in programming?",
    "How do I handle errors in my code?",
    "What is the difference between synchronous and asynchronous programming?",
    "Explain the concept of Big O notation"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) return;

    setIsLoading(true);
    const currentQuestion = question;

    try {
      const response = await axios.post(`${apiBaseUrl}/api/ask-question`, {
        question: currentQuestion
      });

      const newConversation = {
        id: Date.now(),
        question: currentQuestion,
        answer: response.data.answer,
        timestamp: new Date().toLocaleTimeString()
      };

      setConversationHistory(prev => [newConversation, ...prev]);
      setAnswer(response.data.answer);
      setQuestion('');
    } catch (error) {
      setAnswer('Sorry, I encountered an error while processing your question. Please try again.');
      console.error('Error asking question:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuestion) => {
    setQuestion(exampleQuestion);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <MessageCircle className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Ask Programming Questions
          </h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Get instant answers to your programming questions. Ask about concepts, 
          syntax, best practices, or any coding-related topic.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Question Input Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ask Your Question
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question
                </label>
                <textarea
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask any programming question here..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>
                  {isLoading ? 'Getting Answer...' : 'Ask Question'}
                </span>
              </button>
            </form>
          </div>

          {/* Example Questions */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary-600" />
              <span>Example Questions</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {exampleQuestions.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200 border border-transparent hover:border-gray-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Answer Display Section */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-primary-600" />
              <span>AI Answer</span>
            </h2>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto" />
                  <p className="text-gray-600">Thinking...</p>
                </div>
              </div>
            ) : answer ? (
              <div className="prose prose-sm max-w-none">
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="whitespace-pre-wrap text-gray-800">{answer}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Ask a question to get an AI-powered answer</p>
              </div>
            )}
          </div>

          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Questions
              </h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {conversationHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="border-l-4 border-primary-200 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{item.timestamp}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {item.question}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          <span>Tips for Better Questions</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-1">
            <li>• Be specific about the programming language</li>
            <li>• Include context about what you're trying to achieve</li>
            <li>• Ask about concepts, not just syntax</li>
          </ul>
          <ul className="space-y-1">
            <li>• Mention your experience level if relevant</li>
            <li>• Ask for examples when learning new concepts</li>
            <li>• Request explanations of error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QuestionBox; 