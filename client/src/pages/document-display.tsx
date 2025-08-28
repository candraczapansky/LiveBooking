import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function DocumentDisplay() {
  const [location] = useLocation();

  // public route: /documents/:id
  const documentId = location.split('/documents/')[1]?.split('?')[0];

  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('profilePicture');
    sessionStorage.removeItem('user');
  }, []);

  const { data: doc, isLoading, error } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error('Document not found');
      return res.json();
    },
    enabled: !!documentId,
    retry: 1,
  });

  useEffect(() => {
    if (doc?.title) document.title = `${doc.title} | Glo Head Spa`;
  }, [doc]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Document Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">The document you're looking for doesn't exist or is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{doc.title}</h1>
          {doc.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">{doc.description}</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 border rounded shadow-sm p-4">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: doc.htmlContent || "" }} />
        </div>
      </div>
    </div>
  );
}


