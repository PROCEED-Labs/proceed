'use client';

import React, { useEffect, useRef } from 'react';

import Content from '@/components/content';
import { Space, Typography } from 'antd';
import { updateHtmlForm } from '@/lib/data/html-forms';
import useEditorStateStore, {
  EditorStoreProvider,
} from '@/components/html-form-editor/use-editor-state-store';
import HtmlFormEditor, { HtmlFormEditorRef } from '@/components/html-form-editor';
import { HtmlForm } from '@/lib/html-form-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';

type FormViewProps = {
  data: HtmlForm;
};

const FormEditor: React.FC<FormViewProps> = ({ data }) => {
  const builder = useRef<HtmlFormEditorRef | null>(null);

  const handleSave = async () => {
    const json = builder.current?.getJson();
    const html = builder.current?.getHtml();

    if (json && html) {
      await wrapServerCall({
        fn: () => updateHtmlForm(data.id, { json, html }),
        onSuccess: false,
      });
    }
  };

  const { variables, updateVariables, setEditingEnabled } = useEditorStateStore((state) => state);

  useEffect(() => {
    // initialize the variables in the editor
    updateVariables(data.variables);
    setEditingEnabled(true);
  }, []);

  useEffect(() => {
    if (variables) {
      // store the variable changes made in the editor
      wrapServerCall({
        fn: () => updateHtmlForm(data.id, { variables: variables }),
        onSuccess: false,
      });
    }
  }, [variables]);

  return <HtmlFormEditor ref={builder} json={data.json} onChange={handleSave} />;
};

const FormView: React.FC<FormViewProps> = ({ data }) => {
  return (
    <Content
      headerLeft={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          Form
        </Typography.Text>
      }
      headerCenter={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          {data.name}
        </Typography.Text>
      }
    >
      <Space
        orientation="vertical"
        size="large"
        style={{ display: 'flex', height: '100%', rowGap: 0 }}
      >
        <EditorStoreProvider>
          <FormEditor data={data} />
        </EditorStoreProvider>
      </Space>
    </Content>
  );
};

export default FormView;
