import React, { useState } from 'react';
import { FileNode } from '../types';
import { Folder, FolderOpen, FileCode, FileJson, FileText, ChevronRight, ChevronDown, File as FileIcon, Image, Layout, Settings, Database } from 'lucide-react';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (node: FileNode) => void;
  selectedPath?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch(ext) {
      case 'ts': case 'tsx': return <FileCode className="w-4 h-4 text-blue-400" />;
      case 'js': case 'jsx': return <FileCode className="w-4 h-4 text-yellow-400" />;
      case 'css': case 'scss': case 'less': return <Layout className="w-4 h-4 text-pink-400" />;
      case 'html': return <Layout className="w-4 h-4 text-orange-400" />;
      case 'json': return <FileJson className="w-4 h-4 text-green-400" />;
      case 'md': case 'txt': return <FileText className="w-4 h-4 text-gray-400" />;
      case 'png': case 'jpg': case 'jpeg': case 'svg': return <Image className="w-4 h-4 text-purple-400" />;
      case 'sql': case 'db': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'config': case 'env': return <Settings className="w-4 h-4 text-slate-400" />;
      default: return <FileIcon className="w-4 h-4 text-slate-500" />;
  }
};

const FileTreeNode: React.FC<{ node: FileNode; onSelect: (n: FileNode) => void; selectedPath?: string; depth: number }> = ({ node, onSelect, selectedPath, depth }) => {
  const [isOpen, setIsOpen] = useState(depth < 1); // Open root folders by default
  const isSelected = node.path === selectedPath;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.kind === 'directory') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <div 
        className={`
            flex items-center py-1.5 px-2 cursor-pointer transition-all border-l-2 select-none text-sm font-medium
            ${isSelected 
                ? 'bg-blue-500/10 border-blue-500 text-white' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1.5 opacity-70 shrink-0">
          {node.kind === 'directory' && (
             <span className="transition-transform duration-200 inline-block">
                 {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
             </span>
          )}
          {node.kind === 'file' && <span className="w-3 inline-block"></span>}
        </span>
        
        <span className="mr-2 shrink-0">
          {node.kind === 'directory' ? (
            isOpen ? <FolderOpen className="w-4 h-4 text-blue-300" /> : <Folder className="w-4 h-4 text-blue-400" />
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        
        <span className="truncate">{node.name}</span>
      </div>
      
      {isOpen && node.children && (
        <div className="animate-in slide-in-from-top-1 duration-200 fade-in">
          {node.children.sort((a,b) => {
              // Directories first
              if (a.kind === b.kind) return a.name.localeCompare(b.name);
              return a.kind === 'directory' ? -1 : 1;
          }).map((child) => (
            <FileTreeNode 
              key={child.path} 
              node={child} 
              onSelect={onSelect} 
              selectedPath={selectedPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, selectedPath }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-10">
      {nodes.map((node) => (
        <FileTreeNode 
          key={node.path} 
          node={node} 
          onSelect={onSelectFile} 
          selectedPath={selectedPath}
          depth={0}
        />
      ))}
    </div>
  );
};

export default FileTree;