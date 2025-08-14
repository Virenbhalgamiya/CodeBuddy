import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ code, setCode, language, executionResult, apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000' }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const hoverDisposeRef = useRef(null);
  const decorationsRef = useRef([]);
  const [tooltip, setTooltip] = useState(null); // { top, left, message, fixLabel }
  const mouseMoveDisposeRef = useRef(null);
  const dynamicFixRef = useRef(null);

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
    fontFamily: 'monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs-light',
    wordWrap: 'on',
    folding: true,
    lineDecorationsWidth: 20,
    lineNumbersMinChars: 3,
    glyphMargin: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    disableLayerHinting: true,
    renderLineHighlight: 'all',
    selectOnLineNumbers: true,
    hover: { enabled: true, delay: 150, sticky: true },
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  };

  const parseError = (errText) => {
    if (!errText) return null;
    let lineNumber = null;
    let token = null;

    const m1 = errText.match(/line\s+(\d+)/i);
    if (m1) lineNumber = parseInt(m1[1], 10);
    const m2 = errText.match(/name\s+'([^']+)'\s+is\s+not\s+defined/i);
    if (m2) token = m2[1];

    const m3 = errText.match(/:(\d+):(\d+)/);
    if (!lineNumber && m3) lineNumber = parseInt(m3[1], 10);
    const m4 = errText.match(/([^\s]+)\s+is\s+not\s+defined/);
    if (!token && m4) token = m4[1].replace(/["'`]/g, '');

    return lineNumber ? { lineNumber, token } : null;
  };

  const suggestFix = (token, codeText, lineNumber, lang) => {
    const languageId = (lang || '').toLowerCase();
    if (!token) {
      // No specific token: do not auto-insert; just provide a generic label
      return { label: 'Review this line: define variable or import symbol', apply: () => {} };
    }
    if (token === 'pd' && !/import\s+pandas\s+as\s+pd/.test(codeText)) {
      return {
        label: 'Add "import pandas as pd" at top',
        apply: (editor) => {
          editor.executeEdits('inline-fix', [
            { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'import pandas as pd\n' }
          ]);
        }
      };
    }
    if (token === 'np' && !/import\s+numpy\s+as\s+np/.test(codeText)) {
      return {
        label: 'Add "import numpy as np" at top',
        apply: (editor) => {
          editor.executeEdits('inline-fix', [
            { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'import numpy as np\n' }
          ]);
        }
      };
    }
    if (token === 'plt' && !/import\s+matplotlib\.pyplot\s+as\s+plt/.test(codeText)) {
      return {
        label: 'Add "import matplotlib.pyplot as plt" at top',
        apply: (editor) => {
          editor.executeEdits('inline-fix', [
            { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: 'import matplotlib.pyplot as plt\n' }
          ]);
        }
      };
    }
    // Generic message with no auto edit for unknown tokens
    if (languageId === 'python') {
      return { label: `Define or import "${token}"`, apply: () => {} };
    }
    if (languageId === 'javascript') {
      return { label: `Define or import "${token}"`, apply: () => {} };
    }
    return { label: `Define or import "${token}"`, apply: () => {} };
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (hoverDisposeRef.current && typeof hoverDisposeRef.current.dispose === 'function') {
      hoverDisposeRef.current.dispose();
      hoverDisposeRef.current = null;
    }
    if (decorationsRef.current && decorationsRef.current.length) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
    if (mouseMoveDisposeRef.current && typeof mouseMoveDisposeRef.current.dispose === 'function') {
      mouseMoveDisposeRef.current.dispose();
      mouseMoveDisposeRef.current = null;
    }
    setTooltip(null);

    const errText = executionResult && !executionResult.success ? executionResult.error : null;
    const parsed = parseError(errText || '');
    if (!parsed) return;

    const model = editor.getModel();
    if (!model) return;

    const { lineNumber, token } = parsed;
    const lineContent = model.getLineContent(lineNumber);
    const tokenIdx = token ? lineContent.indexOf(token) : -1;

    const newDecorations = [];
    newDecorations.push({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        isWholeLine: true,
        className: 'inline-error-line',
        glyphMarginClassName: 'inline-error-glyph',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    });

    let startCol = 1;
    let endCol = model.getLineMaxColumn(lineNumber);
    if (token && tokenIdx >= 0) {
      startCol = tokenIdx + 1;
      endCol = startCol + token.length;
      newDecorations.push({
        range: new monaco.Range(lineNumber, startCol, lineNumber, endCol),
        options: { inlineClassName: 'inline-error-token' }
      });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    let fix = suggestFix(token, model.getValue(), lineNumber, language);

    // Fetch dynamic, context-aware suggestion
    axios.post(`${apiBaseUrl}/api/line-fix-suggestion`, {
      code: model.getValue(),
      language,
      error: errText || '',
      line: lineNumber
    }).then((resp) => {
      if (resp.data && resp.data.label) {
        dynamicFixRef.current = resp.data;
        const dyn = resp.data;
        const dynamicFix = {
          label: dyn.label,
          apply: (editor) => {
            if (dyn.edit && Number.isInteger(dyn.edit.startLine)) {
              editor.executeEdits('inline-fix', [
                { range: {
                    startLineNumber: dyn.edit.startLine,
                    startColumn: dyn.edit.startColumn,
                    endLineNumber: dyn.edit.endLine,
                    endColumn: dyn.edit.endColumn
                  }, text: dyn.edit.text }
              ]);
            }
          }
        };
        // Update tooltip suggestion if currently visible
        if (tooltip && tooltip.fixLabel) {
          setTooltip((t) => t ? { ...t, fixLabel: dynamicFix.label, apply: dynamicFix.apply } : t);
        }
      }
    }).catch(() => {
      // ignore, keep heuristic fix
    });

    // Also add a diagnostic marker so hover works on token/line reliably
    const markerStartCol = token && tokenIdx >= 0 ? tokenIdx + 1 : 1;
    const markerEndCol = token && tokenIdx >= 0 ? markerStartCol + token.length : model.getLineMaxColumn(lineNumber);
    const markerMessage = `${(errText ? `Error: ${errText.replace(/\n+/g, ' ')}` : '').trim()}${fix && fix.label ? (errText ? '\n' : '') + `Suggested Fix: ${fix.label}` : ''}`;
    monaco.editor.setModelMarkers(model, 'inline-error', [
      {
        startLineNumber: lineNumber,
        startColumn: markerStartCol,
        endLineNumber: lineNumber,
        endColumn: markerEndCol,
        message: markerMessage,
        severity: monaco.MarkerSeverity.Error
      }
    ]);

    hoverDisposeRef.current = monaco.languages.registerHoverProvider(getLanguageId(language), {
      provideHover: (m, position) => {
        if (position.lineNumber !== lineNumber) return null;
        const currentDyn = dynamicFixRef.current;
        const label = currentDyn && currentDyn.label ? currentDyn.label : (fix && fix.label ? fix.label : null);
        const parts = [];
        if (errText) parts.push({ value: `**❌ Error:** ${errText.replace(/\n+/g, ' ')}` });
        if (label) parts.push({ value: `**💡 Suggested Fix:** ${label}` });
        if (parts.length === 0) return null;
        return {
          range: new monaco.Range(lineNumber, 1, lineNumber, m.getLineMaxColumn(lineNumber)),
          contents: parts
        };
      }
    });

    // Context menu action to apply latest suggestion
    editor.addAction({
      id: 'apply-inline-fix',
      label: 'Apply Suggested Fix',
      keybindings: [],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 0.1,
      run: (ed) => {
        const currentDyn = dynamicFixRef.current;
        if (currentDyn && currentDyn.edit && Number.isInteger(currentDyn.edit.startLine)) {
          ed.executeEdits('inline-fix', [
            { range: {
                startLineNumber: currentDyn.edit.startLine,
                startColumn: currentDyn.edit.startColumn,
                endLineNumber: currentDyn.edit.endLine,
                endColumn: currentDyn.edit.endColumn
              }, text: currentDyn.edit.text }
          ]);
          return;
        }
        if (fix && typeof fix.apply === 'function') {
          fix.apply(ed);
        }
      }
    });

    // Custom fallback tooltip using mouse move (show error + suggestion)
    mouseMoveDisposeRef.current = editor.onMouseMove((e) => {
      if (!e || !e.target || !e.target.position) return;
      const pos = e.target.position;
      if (pos.lineNumber !== lineNumber) {
        if (tooltip) setTooltip(null);
        return;
      }
      const coord = editor.getScrolledVisiblePosition({ lineNumber, column: markerStartCol }) || editor.getScrolledVisiblePosition({ lineNumber, column: 1 });
      if (!coord) return;
      const domNode = editor.getDomNode();
      if (!domNode) return;
      const containerWidth = domNode.clientWidth;
      const containerHeight = domNode.clientHeight;
      let top = coord.top + 20; // below line
      let left = coord.left + 10;
      const padding = 12;
      if (left > containerWidth - 240) left = containerWidth - 240;
      if (left < padding) left = padding;
      if (top > containerHeight - 120) top = containerHeight - 120;
      if (top < padding) top = padding;
      const message = `${errText ? '❌ ' + errText.replace(/\n+/g, ' ') : ''}`;
      const currentDyn = dynamicFixRef.current;
      const fixLabel = currentDyn && currentDyn.label ? currentDyn.label : (fix && fix.label ? fix.label : null);
      const apply = (ed) => {
        if (currentDyn && currentDyn.edit && Number.isInteger(currentDyn.edit.startLine)) {
          ed.executeEdits('inline-fix', [
            { range: {
                startLineNumber: currentDyn.edit.startLine,
                startColumn: currentDyn.edit.startColumn,
                endLineNumber: currentDyn.edit.endLine,
                endColumn: currentDyn.edit.endColumn
              }, text: currentDyn.edit.text }
          ]);
        } else if (fix && typeof fix.apply === 'function') {
          fix.apply(ed);
        }
      };
      setTooltip({ top, left, message, fixLabel, apply });
    });

    // Hide tooltip on scroll to force reposition on next hover
    const scrollDispose = editor.onDidScrollChange(() => {
      if (tooltip) setTooltip(null);
    });

    return () => {
      if (hoverDisposeRef.current && typeof hoverDisposeRef.current.dispose === 'function') {
        hoverDisposeRef.current.dispose();
        hoverDisposeRef.current = null;
      }
      if (decorationsRef.current && decorationsRef.current.length) {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      }
      if (monaco && model) {
        monaco.editor.setModelMarkers(model, 'inline-error', []);
      }
      if (mouseMoveDisposeRef.current && typeof mouseMoveDisposeRef.current.dispose === 'function') {
        mouseMoveDisposeRef.current.dispose();
        mouseMoveDisposeRef.current = null;
      }
      if (scrollDispose && typeof scrollDispose.dispose === 'function') scrollDispose.dispose();
      setTooltip(null);
    };
  }, [executionResult, language]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm relative">
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
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            editor.focus();
            editor.getModel().updateOptions({ tabSize: 2, insertSpaces: true });
          }}
        />
      </div>
      {tooltip && (
        <div
          className="absolute z-50 bg-white border border-gray-300 shadow-lg rounded-md p-3 text-sm max-w-sm"
          style={{ top: tooltip.top, left: tooltip.left }}
          onMouseLeave={() => setTooltip(null)}
        >
          <div className="text-gray-900 font-medium mb-2">💡 Suggested Fix</div>
          {tooltip.fixLabel && (
            <button
              className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
              onClick={() => {
                if (tooltip.apply && editorRef.current) tooltip.apply(editorRef.current);
                setTooltip(null);
              }}
            >
              Apply Fix: {tooltip.fixLabel}
            </button>
          )}
        </div>
      )}
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