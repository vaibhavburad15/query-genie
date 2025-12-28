import React, { useState } from 'react';
import { AlertCircle, Database, Table, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SqlQueryViewer from './SqlQueryViewer';
import EnhancedDataTable from './EnhancedDataTable';
import queryGenieLogo from '@/assets/query-genie-logo.png';

// Helper function to parse SQL output string to structured data
function parseSqlOutput(output: string): {
  type: 'select' | 'status' | 'error' | 'confirmation_required';
  data?: string[][];
  columns?: string[];
  message?: string;
  rowCount?: number;
  table?: {
    columns: string[];
    data: string[][];
  };
  sql?: string;
} | null {
  try {
    const parsed = JSON.parse(output);

    if (parsed?.type === "confirmation_required") {
      return parsed;
    }
  } catch {
    // Not JSON → continue to normal SQL parsing
  }
  console.log('Parsing output:', output);
  try {
    // Extract JSON from Output: {...}
    const match = output.match(/Output:\s*(\{.*\})/s);
    if (match) {
      const jsonString = match[1];
      console.log('Extracted JSON string:', jsonString);

      try {
        const parsed = JSON.parse(jsonString);
        console.log('Parsed structured data:', parsed);
        return parsed;
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        return null;
      }
    }

    // Fallback: If no JSON found, assume old format and return as error or status
    console.warn('No structured output found, falling back to legacy parsing');
    return {
      type: 'error',
      message: 'Unable to parse response format'
    };
  } catch (error) {
    console.error('Error parsing output:', error, 'Output was:', output);
    return null;
  }
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  role?: 'user' | 'ai';
}

interface ChatWindowProps {
  messages: Message[];
  onConnectDatabase: () => void;
  onConfirmSql: (sql: string) => void;
  onCancelSql: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onConnectDatabase,
  onConfirmSql,
  onCancelSql,
}) => {
  const [sqlVisibility, setSqlVisibility] = useState<Record<string, boolean>>({});
  const [confirmationHandled, setConfirmationHandled] = useState<Record<string, boolean>>({});
  console.log('Rendering ChatWindow with messages:', messages);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-16 max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-50 h-50 rounded-full mb-6">
                <img src={queryGenieLogo} alt="Query Genie Logo" className="h-20 w-20 object-contain" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Query Genie
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Transform your natural language questions into powerful database insights. 
                Connect your data source and start exploring with AI-powered queries.
              </p>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Database</h3>
                <p className="text-gray-600 text-sm">Link to MySQL, PostgreSQL, or upload Excel files to get started</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Natural Questions</h3>
                <p className="text-gray-600 text-sm">Use plain English like "Show me sales by region" or "Find top customers"</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                  <Table className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Instant Results</h3>
                <p className="text-gray-600 text-sm">View formatted tables, export data, and see the generated SQL queries</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            console.log('Processing message:', message);
            const effectiveType = message.role === 'ai' ? 'assistant' : message.type;
            
            if (effectiveType === 'assistant') {
              const sqlMatch = message.content.match(/SQL:\s*[`']([^`']+)[`']/);
              const parsedOutput = parseSqlOutput(message.content);
              
              // 🟡 CONFIRMATION REQUIRED TABLE
              if (
                parsedOutput?.type === 'confirmation_required' &&
                parsedOutput.table &&
                !confirmationHandled[message.id]
              ) {
                return (
                  <div key={message.id} className="space-y-4">
                    
                    {/* Warning box */}
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-6 py-4 rounded-lg">
                      <p className="font-semibold mb-2">⚠️ Confirmation Required</p>
                      <p className="text-sm">
                        This action will permanently modify the database.
                      </p>
                    </div>

                    {/* Preview Table (same as SELECT table UI) */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-4">
                        <EnhancedDataTable
                          data={parsedOutput.table.data}
                          columns={parsedOutput.table.columns}
                          pageSize={5}
                          searchable={false}
                          sortable={false}
                          exportable={false}
                        />
                      </div>
                    </div>

                    {/* Confirm / Cancel buttons */}
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setConfirmationHandled(prev => ({ ...prev, [message.id]: true }));
                          onConfirmSql(parsedOutput.sql!);
                        }}
                      >
                        Confirm & Execute
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setConfirmationHandled(prev => ({ ...prev, [message.id]: true }));
                          onCancelSql();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              if (sqlMatch && parsedOutput) {
                const showSqlQuery = sqlVisibility[message.id] || false;

                if (parsedOutput.type === 'select' && parsedOutput.data) {
                  // ✅ Use columns from backend response (real database column names)
                  // Or generate generic names if not provided
                  let columns: string[] = [];
                  
                  if (parsedOutput.columns && parsedOutput.columns.length > 0) {
                    // Use real column names from database
                    columns = parsedOutput.columns;
                  } else if (parsedOutput.data.length > 0) {
                    // Fallback: generate generic column names based on data width
                    columns = parsedOutput.data[0].map((_, idx) => `Column_${idx + 1}`);
                  } else {
                    columns = ['Value'];
                  }
                  
                  const rowCount = parsedOutput.rowCount || parsedOutput.data.length;

                  console.log('Columns:', columns, 'OutputData:', parsedOutput.data);

                  return (
                    <div key={message.id} className="space-y-4">
                      {/* SQL Query Viewer */}
                      <SqlQueryViewer
                        query={sqlMatch[1]}
                        rowCount={rowCount}
                        isVisible={showSqlQuery}
                        onToggleVisibility={() => setSqlVisibility(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                      />

                      {/* Enhanced Data Table */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Table className="h-4 w-4 text-gray-600" />
                              <h3 className="text-sm font-medium text-gray-900">Query Results</h3>
                            </div>
                            <div className="text-xs text-gray-500">
                              {rowCount} row{rowCount !== 1 ? 's' : ''} returned
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          <EnhancedDataTable
                            data={parsedOutput.data}
                            columns={columns}
                            totalRows={rowCount}
                            pageSize={10}
                            searchable={true}
                            sortable={true}
                            exportable={true}
                          />
                        </div>
                      </div>
                    </div>
                  );
                } else if (parsedOutput.type === 'status') {
                  return (
                    <div key={message.id} className="space-y-4">
                      {/* SQL Query Viewer */}
                      <SqlQueryViewer
                        query={sqlMatch[1]}
                        rowCount={0}
                        isVisible={showSqlQuery}
                        onToggleVisibility={() => setSqlVisibility(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                      />

                      {/* Success Alert */}
                      <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg max-w-[90%] flex items-start gap-3 shadow-sm">
                        <div className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">✓</div>
                        <div>
                          <p className="font-medium">{parsedOutput.message || 'Statement executed successfully'}</p>
                        </div>
                      </div>
                    </div>
                  );
                } else if (parsedOutput.type === 'error') {
                  return (
                    <div key={message.id} className="space-y-4">
                      {/* SQL Query Viewer */}
                      {sqlMatch && (
                        <SqlQueryViewer
                          query={sqlMatch[1]}
                          rowCount={0}
                          isVisible={showSqlQuery}
                          onToggleVisibility={() => setSqlVisibility(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                        />
                      )}

                      {/* Error Alert */}
                      <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-[90%] flex items-start gap-3 shadow-sm">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
                        <div>
                          <p className="font-medium whitespace-pre-wrap">{parsedOutput.message || 'An error occurred'}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div key={message.id} className="flex justify-start">
                  <div className="bg-white border border-gray-200 shadow-sm text-gray-900 px-6 py-4 rounded-lg max-w-[90%] overflow-auto">
                    <pre className="font-mono text-sm whitespace-pre-wrap">
                      {message.content}
                    </pre>
                  </div>
                </div>
              );
            }

            // User messages
            if (effectiveType === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="bg-blue-600 text-white px-6 py-4 rounded-lg max-w-[80%] shadow-sm">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              );
            }

            // Error messages
            if (effectiveType === 'error') {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg max-w-[80%] flex items-start gap-3 shadow-sm">
                    <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
                    <div className="space-y-3">
                      <p className="font-medium">{message.content}</p>
                      <Button
                        onClick={onConnectDatabase}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-800 hover:bg-red-100"
                      >
                        <Database size={16} className="mr-2" />
                        Connect Database
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
};

export default ChatWindow;