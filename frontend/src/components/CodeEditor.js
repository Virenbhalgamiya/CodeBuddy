import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, setCode, language }) => {
  const getLanguageId = (language) => {
    const languageMap = {
      python: 'python',
      javascript: 'javascript',
      cpp: 'cpp'
    };
    return languageMap[language] || 'python';
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: 'Fira Code, monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs-light',
    wordWrap: 'on',
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    glyphMargin: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    disableLayerHinting: true,
    renderLineHighlight: 'all',
    selectOnLineNumbers: true,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {language.charAt(0).toUpperCase() + language.slice(1)} Editor
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
        </div>
      </div>
      
      <div className="h-96">
        <Editor
          height="100%"
          language={getLanguageId(language)}
          value={code}
          onChange={handleEditorChange}
          options={editorOptions}
          theme="vs-light"
          onMount={(editor) => {
            // Focus the editor
            editor.focus();
            
            // Set up auto-completion
            editor.getModel().updateOptions({
              tabSize: 2,
              insertSpaces: true
            });
          }}
        />
      </div>
      
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-300">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Line: 1 | Column: 1</span>
          <span>{code.length} characters</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 