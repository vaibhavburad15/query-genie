import React, { useState } from 'react';
import { AlertCircle, Database, Table, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SqlQueryViewer from './SqlQueryViewer';
import EnhancedDataTable from './EnhancedDataTable';
import queryGenieLogo from '@/assets/query-genie-logo.png';

// Helper function to parse SQL output string to array of rows
function parseSqlOutput(output: string): string[][] | null {
  console.log('Parsing output:', output);
  try {
    // Match the Output: [...] format with flexibility
    const match = output.match(/Output:\s*\[(.*?)\]/s);
    if (match) {
      let dataString = match[1]
        .replace(/'/g, '"') // Convert single quotes to double quotes for JSON parsing
        .trim();
      
      console.log('Processed dataString:', dataString);

      // Try to parse as JSON array
      try {
        const jsonArray = JSON.parse(`[${dataString}]`);
        if (Array.isArray(jsonArray)) {
          // Convert each item to a row with single column
          const data = jsonArray.map((item: any) => [String(item)]);
          console.log('Parsed JSON data:', data);
          return data;
        }
      } catch (jsonError) {
        console.log('JSON parsing failed, trying manual parsing');
      }

      // Manual parsing as fallback
      const items = dataString
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, '')) // Remove surrounding quotes
        .filter((item) => item.length > 0);
      
      if (items.length === 0) {
        console.warn('No valid items found in dataString:', dataString);
        return null;
      }

      // Create an array of rows, each with a single column
      const data = items.map((item) => [item]);
      console.log('Parsed manual data:', data);
      return data;
    }

    // Alternative pattern matching for different output formats
    const alternativeMatch = output.match(/Output:\s*(.*?)(?=\n\n|$)/s);
    if (alternativeMatch) {
      const lines = alternativeMatch[1]
        .split(/,|\n/)
        .map((line) => line.trim().replace(/^['"]|['"]$/g, ''))
        .filter((line) => line.length > 0 && !line.includes('$$'));
      
      if (lines.length > 0) {
        const data = lines.map((line) => [line]);
        console.log('Alternative parsed data:', data);
        return data;
      }
    }

    // Fallback: Handle line-by-line output
    const lines = output.split('\n').filter((line) => line.trim() !== '');
    if (lines.length === 0) {
      console.warn('No lines found in output:', output);
      return null;
    }

    console.log('Fallback lines:', lines);
    const data = lines.map((line) => [line.trim()]);
    return data;
  } catch (error) {
    console.error('Error parsing output:', error, 'Output was:', output);
    return null;
  }
}

// Helper function to extract column names from SQL query string or fallback to generics
function extractColumnsFromSql(sql: string | null, outputData: string[][] | null): string[] {
  console.log('Extracting columns, SQL:', sql, 'OutputData:', outputData);
  
  if (!sql || !outputData) {
    return ['Value'];
  }

  // Try to extract columns from SQL query
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
  if (selectMatch) {
    const columnsPart = selectMatch[1];
    const columns = columnsPart
      .split(',')
      .map((col) => col.trim())
      .map((col) => {
        // Handle AS aliases
        const asMatch = col.match(/AS\s+(\w+)/i);
        if (asMatch) {
          return asMatch[1];
        }
        
        // Handle CONCAT and other functions
        if (col.includes('CONCAT')) {
          return 'PersonName'; // Default for CONCAT operations
        }
        
        // Handle dot notation (table.column)
        const parts = col.split('.');
        const cleanColumn = parts[parts.length - 1].replace(/[()]/g, '');
        return cleanColumn;
      });
    
    return columns.length > 0 ? columns : ['Value'];
  }

  // Fallback based on data structure
  if (outputData && outputData.length > 0) {
    // Check if it looks like names
    const firstValue = outputData[0][0];
    if (firstValue && firstValue.includes(' ') && /^[A-Za-z\s]+$/.test(firstValue)) {
      return ['Name'];
    }
    return ['Value'];
  }

  return ['Value'];
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  role?: string;
}

interface ChatWindowProps {
  messages: Message[];
  onConnectDatabase: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onConnectDatabase }) => {
  console.log('Rendering ChatWindow with messages:', messages);

  const [sqlVisibility, setSqlVisibility] = useState<Record<string, boolean>>({});

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
              const outputData = parseSqlOutput(message.content);

              if (sqlMatch && outputData && outputData.length > 0) {
                const columns = extractColumnsFromSql(sqlMatch[1], outputData);
                const showSqlQuery = sqlVisibility[message.id] || false;

                console.log('Columns:', columns, 'OutputData:', outputData);

                return (
                  <div key={message.id} className="space-y-4">
                    {/* SQL Query Viewer */}
                    <SqlQueryViewer
                      query={sqlMatch[1]}
                      rowCount={outputData.length}
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
                            {outputData.length} row{outputData.length !== 1 ? 's' : ''} returned
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <EnhancedDataTable
                          data={outputData}
                          columns={columns}
                          totalRows={outputData.length}
                          pageSize={10}
                          searchable={true}
                          sortable={true}
                          exportable={true}
                        />
                      </div>
                    </div>
                  </div>
                );
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