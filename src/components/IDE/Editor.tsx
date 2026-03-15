import React from 'react';
import Editor from "@monaco-editor/react";
import { X, FileText, Save } from 'lucide-react';

interface IDEEditorProps {
  activeFile: { path: string; content: string; name: string } | null;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const IDEEditor: React.FC<IDEEditorProps> = ({ activeFile, onContentChange, onSave, onClose }) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1E1E1E]">
      {activeFile ? (
        <>
          <div className="flex bg-[#0F0F0F] border-b border-zinc-800">
            <div className="px-4 py-2.5 bg-[#1E1E1E] border-r border-zinc-800 flex items-center gap-2 text-xs text-emerald-400 min-w-[120px]">
              <FileText className="w-3 h-3" />
              <span className="truncate">{activeFile.name}</span>
              <button onClick={onClose} className="ml-auto p-0.5 hover:bg-zinc-800 rounded transition-all">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              path={activeFile.path}
              value={activeFile.content}
              onChange={(val) => onContentChange(val || '')}
              options={{
                fontSize: 12,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 }
              }}
            />
            <button 
              onClick={onSave}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg font-medium shadow-lg hover:bg-emerald-400 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-xs italic">
          Select a file to start editing
        </div>
      )}
    </div>
  );
};
