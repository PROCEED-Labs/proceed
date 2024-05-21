'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import Macro from '../macro/macro';

const MacroEditor = () => {
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    if (window.AP) {
      console.log('window AP', window.AP);
      window.AP.dialog.getCustomData((data) => {
        console.log('data', data);
        if (data) {
          setProcessId(data.parameters?.processId || '');
        }
      });
    }
  }, []);

  const saveMacro = () => {
    if (window.AP) {
      window.AP.confluence.saveMacro({ processId }, <Macro processId={processId}></Macro>);
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
