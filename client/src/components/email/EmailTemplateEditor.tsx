import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';

interface EmailTemplateEditorProps {
  onDesignChange?: (design: any) => void;
  onHtmlChange?: (html: string) => void;
  initialDesign?: any;
  className?: string;
}

export interface EmailTemplateEditorRef {
  exportHtml: () => void;
}

const EmailTemplateEditor = forwardRef<EmailTemplateEditorRef, EmailTemplateEditorProps>(({
  onDesignChange,
  onHtmlChange,
  initialDesign,
  className = ""
}, ref) => {
  const emailEditorRef = useRef<EditorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(600);

  const exportHtml = () => {
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    unlayer.exportHtml((data) => {
      const { design, html } = data;
      onDesignChange?.(design);
      onHtmlChange?.(html);
    });
  };

  useImperativeHandle(ref, () => ({
    exportHtml
  }));

  useEffect(() => {
    // Calculate container height and set editor height
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.offsetHeight;
        setEditorHeight(Math.max(containerHeight, 600));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    // Also update when container size changes
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Load initial design if provided
    if (initialDesign && emailEditorRef.current) {
      emailEditorRef.current.editor?.loadDesign(initialDesign);
    }
  }, [initialDesign]);

  const onReady = () => {
    // Editor is ready
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;

    // Set custom options with full height
    unlayer.setAppearance({
      theme: 'modern_light',
      panels: {
        tools: {
          dock: 'left'
        }
      }
    });

    // Force editor to resize to container
    setTimeout(() => {
      if (unlayer) {
        // Trigger a resize event to make the editor fit the container
        window.dispatchEvent(new Event('resize'));
      }
    }, 100);

    // Load initial design if provided
    if (initialDesign) {
      unlayer.loadDesign(initialDesign);
    }
  };

  const editorLoaded = () => {
    // Editor instance is loaded
  };

  return (
    <div 
      ref={containerRef}
      className={`email-template-editor w-full h-full ${className}`}
      style={{ height: '100%', minHeight: '600px' }}
    >
      <EmailEditor
        ref={emailEditorRef}
        onReady={onReady}
        onLoad={editorLoaded}
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
          mergeTags: {
            'Client Name': {
              name: 'Client Name',
              value: '{{client_name}}',
              sample: 'John Doe'
            },
            'Client Email': {
              name: 'Client Email',
              value: '{{client_email}}',
              sample: 'john@example.com'
            },
            'Salon Name': {
              name: 'Salon Name',
              value: '{{salon_name}}',
              sample: 'Glo Head Spa'
            },
            'Appointment Date': {
              name: 'Appointment Date',
              value: '{{appointment_date}}',
              sample: 'June 23, 2025'
            },
            'Service Name': {
              name: 'Service Name',
              value: '{{service_name}}',
              sample: 'Hair Cut & Style'
            },
            'Unsubscribe Link': {
              name: 'Unsubscribe Link',
              value: '{{unsubscribe_link}}',
              sample: 'Click here to unsubscribe'
            }
          }
        }}
        style={{ width: '100%', height: `${editorHeight}px` }}
      />
    </div>
  );
});

EmailTemplateEditor.displayName = 'EmailTemplateEditor';

export default EmailTemplateEditor;