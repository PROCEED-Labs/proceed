'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import Macro from '../macro/macro';

const MacroEditor = () => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (window.AP && window.AP.confluence) {
      console.log('window AP', window.AP);
      window.AP.confluence.getMacroData((data: any) => {
        console.log('confluence macroData', data);
        if (data) {
          setProcessId(data.processId || data.parameters?.processId || '');
        }
      });
    }
  }, []);

  const saveMacro = () => {
    if (window.AP && window.AP.confluence) {
      window.AP.confluence.saveMacro({ processId });
      window.AP.confluence.closeMacroEditor();
    }
  };

  return (
    <>
      <Head>
        <title>Proceed Macro Editor</title>
        <script src="https://connect-cdn.atlassian.com/all.js"></script>
      </Head>
      <div>Macro Editor</div>
      <label htmlFor="process-id">Process ID:</label>
      <input
        type="text"
        id="process-id"
        value={processId}
        onChange={(e) => setProcessId(e.target.value)}
      />
      <button onClick={saveMacro}>Save</button>
    </>
  );
};

export default MacroEditor;
