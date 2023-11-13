'use client';

import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill').then((mod) => mod.default), { ssr: false });

import React from 'react';
import 'react-quill/dist/quill.snow.css';

type TextEditorProps = {
  placeholder?: string;
  value: string;
  handleChange: (value: string) => void;
};
const TextEditor: React.FC<TextEditorProps> = ({ placeholder, value, handleChange }) => {
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

  return (
    <ReactQuill
      modules={modules}
      theme="snow"
      placeholder={placeholder}
      value={value}
      onChange={(value, _, source) => {
        // check if change was initiated by user and not due to change of value prop from parent component
        if (source === 'user') {
          handleChange(value);
        }
      }}
    />
  );
};

export default TextEditor;
