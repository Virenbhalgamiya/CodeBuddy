import React from 'react';
import { AlertCircle, CheckCircle, Info, Lightbulb, Loader } from 'lucide-react';

const ResultBox = ({ 
  result, 
  onSolveError, 
  isLoadingExplanation, 
  errorExplanation 
}) => {
  if (!result) {
    return (
      <div className="border border-gray-300 rounded-lg bg-white p-6">
        <div className="flex items-center space-x-3 text-gray-500">
          <Info className="h-5 w-5" />
          <span className="text-sm">No code executed yet. Run your code to see results here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Result Display */}
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Execution Result
            </span>
            <div className="flex items-center space-x-2">
              {result.success ? (
                <div className="flex items-center space-x-1 text-success-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Success</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-error-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Error</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-success-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Code executed successfully!
                  </h3>
                  {result.output ? (
                    <div className="bg-gray-50 rounded-md p-3">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {result.output}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Code executed without output.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-error-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Execution failed
                  </h3>
                  <div className="error-message">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {result.error}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Solve Error Button */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Lightbulb className="h-4 w-4" />
                  <span>Need guidance on this error?</span>
                </div>
                <button
                  onClick={onSolveError}
                  disabled={isLoadingExplanation}
                  className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoadingExplanation ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lightbulb className="h-4 w-4" />
                  )}
                  <span>
                    {isLoadingExplanation ? 'Analyzing...' : 'Get Guidance'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Explanation */}
      {errorExplanation && (
        <div className="border border-primary-200 rounded-lg bg-primary-50 p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-5 w-5 text-primary-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-primary-900 mb-2">
                Conceptual Guidance
              </h3>
              <div className="text-sm text-primary-800 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{errorExplanation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      {result && (
        <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Tips
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use the "Get Guidance" button to get conceptual help with errors</li>
                <li>• Check the Live Code Analysis for real-time conceptual explanations</li>
                <li>• Ask questions in the Conceptual Questions section for guidance</li>
                <li>• The AI provides guidance and reasoning, not direct code solutions</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultBox; 