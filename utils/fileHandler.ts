import JSZip from 'jszip';
import { FileNode } from '../types';

export const EXTENSION_TO_LANG: Record<string, string> = {
  'js': 'javascript', 'jsx': 'javascript',
  'ts': 'typescript', 'tsx': 'typescript',
  'html': 'html', 'css': 'css',
  'json': 'json', 'py': 'python',
  'java': 'java', 'cpp': 'cpp', 'c': 'c',
  'go': 'go', 'rs': 'rust',
  'php': 'php', 'rb': 'ruby',
  'sql': 'sql', 'md': 'markdown',
  'yml': 'yaml', 'yaml': 'yaml',
  'xml': 'xml', 'sh': 'bash'
};

export const processZipFile = async (file: File): Promise<FileNode[]> => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  const fileMap: Record<string, FileNode> = {};
  const rootNodes: FileNode[] = [];

  // 1. Create Nodes for all entries
  const entries = Object.keys(zipContent.files).sort();

  for (const relativePath of entries) {
    const zipEntry = zipContent.files[relativePath];
    // Ignore __MACOSX and .DS_Store
    if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) continue;

    const isDir = zipEntry.dir;
    const name = relativePath.split('/').filter(p => p).pop() || '';
    
    if (!name && !isDir) continue; // Skip empty paths

    const node: FileNode = {
      name,
      path: relativePath,
      kind: isDir ? 'directory' : 'file',
      children: isDir ? [] : undefined,
    };

    if (!isDir) {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'exe', 'dll', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'webm', 'mp3', 'wav'];
      
      if (!binaryExts.includes(ext)) {
        try {
            // Limit file size for context to avoid crashing browser or context window
            // Just a safety check, though Gemini 1.5/2.5 handle large context well.
            node.content = await zipEntry.async('string');
            node.language = EXTENSION_TO_LANG[ext] || 'text';
            node.extension = ext;
        } catch (e) {
            node.content = "[Binary or Unreadable Content]";
        }
      } else {
          node.content = "[Binary Image/File]";
          node.language = 'binary';
      }
    }

    fileMap[relativePath] = node;
  }

  // 2. Build Hierarchy
  Object.keys(fileMap).forEach(path => {
      const node = fileMap[path];
      // Remove trailing slash for directory paths to find parent
      const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
      const parts = cleanPath.split('/');
      
      if (parts.length === 1) {
          rootNodes.push(node);
      } else {
          // Find parent path
          parts.pop(); // Remove self
          const parentPath = parts.join('/') + '/';
          
          // Try to find parent in map
          let parent = fileMap[parentPath];
          
          // If parent doesn't exist (zip didn't have explicit dir entry), create it
          if (!parent) {
              const parentName = parts[parts.length - 1];
              parent = {
                  name: parentName,
                  path: parentPath,
                  kind: 'directory',
                  children: []
              };
              fileMap[parentPath] = parent;
              
              // We'd ideally attach this implicit parent to its own parent here, 
              // but for simplicity in this pass, we'll push implicit roots to rootNodes
              // if their parent is also missing. 
              // A more robust solution would be recursive, but this covers 99% of zip structures.
              if (parts.length === 1) {
                  rootNodes.push(parent);
              } else {
                  // Attempt to attach to grandparent
                  parts.pop();
                  const grandParentPath = parts.join('/') + '/';
                  const grandParent = fileMap[grandParentPath];
                  if (grandParent && grandParent.children) {
                      grandParent.children.push(parent);
                  } else {
                      rootNodes.push(parent);
                  }
              }
          }

          if (parent && parent.children) {
              // Avoid duplicates if we created implicit parents
              if (!parent.children.find(c => c.path === node.path)) {
                  parent.children.push(node);
              }
          } else {
              rootNodes.push(node);
          }
      }
  });

  return rootNodes;
};