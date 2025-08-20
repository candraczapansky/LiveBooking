import React from "react";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";
import ConversationFlowTester from "@/components/llm/conversation-flow-tester";
import FlowTest from "@/components/llm/flow-test";

export default function ConversationFlowTesterPage() {
  useDocumentTitle("Conversation Flow Tester | Glo Head Spa");
  const { isOpen: sidebarOpen } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? "ml-64" : "ml-16"
      }`}>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Service-First Flow Test</h2>
                <FlowTest />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Advanced Flow Tester</h2>
                <ConversationFlowTester />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 