'use client';

import { useState, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  showImageUpload?: boolean;
  onImageUpload?: (files: File[]) => Promise<string[]>;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '200px',
  maxHeight = '600px',
  showImageUpload = true,
  onImageUpload,
  disabled = false
}: RichTextEditorProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatText = (command: string, value?: string) => {
    if (disabled) return;
    setIsFormatting(true);
    document.execCommand(command, false, value);
    setIsFormatting(false);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current && !isFormatting) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    // Handle shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'u':
          e.preventDefault();
          formatText('underline');
          break;
        case 'k':
          e.preventDefault();
          const url = prompt('Enter URL:');
          if (url) formatText('createLink', url);
          break;
      }
    }

    // Handle Enter for line breaks
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formatText('insertHTML', '<br><br>');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    formatText('insertText', text);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !onImageUpload || disabled) return;
    
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setImageUploading(true);
      const imageUrls = await onImageUpload(files);
      
      // Insert images into editor
      imageUrls.forEach(url => {
        const img = `<img src="${url}" alt="Uploaded image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
        formatText('insertHTML', img);
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const insertLink = () => {
    if (disabled) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    const url = prompt('Enter URL:', 'https://');
    
    if (url && url !== 'https://') {
      if (selectedText) {
        formatText('createLink', url);
      } else {
        const linkText = prompt('Enter link text:', url);
        if (linkText) {
          formatText('insertHTML', `<a href="${url}" target="_blank">${linkText}</a>`);
        }
      }
    }
  };

  const insertList = (type: 'ul' | 'ol') => {
    if (disabled) return;
    formatText(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  };

  const ToolbarButton = ({ 
    onClick, 
    icon, 
    title, 
    active = false 
  }: { 
    onClick: () => void; 
    icon: string; 
    title: string; 
    active?: boolean 
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
        active ? 'bg-gray-200' : ''
      }`}
    >
      <span className="text-sm">{icon}</span>
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => formatText('bold')}
            icon="𝐁"
            title="Bold (Ctrl/Cmd + B)"
          />
          <ToolbarButton
            onClick={() => formatText('italic')}
            icon="𝐼"
            title="Italic (Ctrl/Cmd + I)"
          />
          <ToolbarButton
            onClick={() => formatText('underline')}
            icon="U"
            title="Underline (Ctrl/Cmd + U)"
          />
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Lists */}
          <ToolbarButton
            onClick={() => insertList('ul')}
            icon="•"
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => insertList('ol')}
            icon="1."
            title="Numbered List"
          />
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Link */}
          <ToolbarButton
            onClick={insertLink}
            icon="🔗"
            title="Insert Link (Ctrl/Cmd + K)"
          />
          
          {/* Image upload */}
          {showImageUpload && onImageUpload && (
            <>
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                icon={imageUploading ? "⏳" : "📷"}
                title={imageUploading ? "Uploading..." : "Upload Image"}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={disabled || imageUploading}
              />
            </>
          )}
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {/* Clear formatting */}
          <ToolbarButton
            onClick={() => formatText('removeFormat')}
            icon="🗑️"
            title="Clear Formatting"
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={updateContent}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`p-4 focus:outline-none overflow-auto ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        style={{ minHeight, maxHeight }}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
      />

      <style jsx>{`
        div[contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}