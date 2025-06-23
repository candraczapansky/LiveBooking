import { useRef, useEffect } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';

interface EmailTemplateEditorProps {
  onDesignChange?: (design: any) => void;
  onHtmlChange?: (html: string) => void;
  initialDesign?: any;
  className?: string;
}

export default function EmailTemplateEditor({
  onDesignChange,
  onHtmlChange,
  initialDesign,
  className = ""
}: EmailTemplateEditorProps) {
  const emailEditorRef = useRef<EditorRef>(null);

  useEffect(() => {
    // Load initial design if provided
    if (initialDesign && emailEditorRef.current) {
      emailEditorRef.current.editor?.loadDesign(initialDesign);
    }
  }, [initialDesign]);

  const exportHtml = () => {
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    unlayer.exportHtml((data) => {
      const { design, html } = data;
      onDesignChange?.(design);
      onHtmlChange?.(html);
    });
  };

  const onReady = () => {
    // Editor is ready
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    // Set custom options
    unlayer.setAppearance({
      theme: 'modern_light',
      panels: {
        tools: {
          dock: 'left'
        }
      }
    });

    // Load initial design if provided
    if (initialDesign) {
      unlayer.loadDesign(initialDesign);
    }
  };

  const editorLoaded = () => {
    // Editor instance is loaded
  };

  const onDesignLoad = (data: any) => {
    // Design has been loaded
    onDesignChange?.(data);
  };

  return (
    <div className={`email-template-editor ${className}`}>
      <EmailEditor
        ref={emailEditorRef}
        onReady={onReady}
        onLoad={editorLoaded}
        onDesignLoad={onDesignLoad}
        options={{
          displayMode: 'email',
          locale: 'en',
          features: {
            preview: true,
            imageEditor: true,
            undoRedo: true,
            stockImages: true
          },
          tools: {
            image: {
              enabled: true
            },
            text: {
              enabled: true
            },
            button: {
              enabled: true
            },
            divider: {
              enabled: true
            },
            html: {
              enabled: true
            },
            video: {
              enabled: true
            },
            social: {
              enabled: true
            },
            spacer: {
              enabled: true
            },
            menu: {
              enabled: true
            },
            timer: {
              enabled: true
            }
          },
          mergeTags: [
            {
              name: 'Client Name',
              value: '{{client_name}}',
              sample: 'John Doe'
            },
            {
              name: 'Client Email',
              value: '{{client_email}}',
              sample: 'john@example.com'
            },
            {
              name: 'Salon Name',
              value: '{{salon_name}}',
              sample: 'BeautyBook Salon'
            },
            {
              name: 'Appointment Date',
              value: '{{appointment_date}}',
              sample: 'June 23, 2025'
            },
            {
              name: 'Service Name',
              value: '{{service_name}}',
              sample: 'Hair Cut & Style'
            },
            {
              name: 'Unsubscribe Link',
              value: '{{unsubscribe_link}}',
              sample: 'Click here to unsubscribe'
            }
          ]
        }}
        style={{ height: '600px' }}
      />
      <div className="mt-4 flex justify-end">
        <button
          onClick={exportHtml}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Save Template
        </button>
      </div>
    </div>
  );
}