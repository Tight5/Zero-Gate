/**
 * Excel File Processor Component
 * Based on attached asset File 31 specification with pandas/openpyxl integration
 * Provides comprehensive Excel file processing for dashboard data insights
 */

import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  FileText,
  Database,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react';

interface ProcessingResult {
  file_id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  processing_time: number;
  insights: {
    total_rows: number;
    total_columns: number;
    data_quality_score: number;
    missing_values: number;
    duplicate_rows: number;
    identified_patterns: string[];
  };
  extracted_data: {
    sponsors: Array<{
      name: string;
      type: string;
      tier: number;
      contact_info: any;
      funding_capacity: number;
    }>;
    grants: Array<{
      title: string;
      amount: number;
      deadline: string;
      status: string;
      requirements: string[];
    }>;
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }>;
    financial_data: Array<{
      category: string;
      amount: number;
      date: string;
      notes: string;
    }>;
  };
  recommendations: Array<{
    type: 'data_quality' | 'relationship' | 'funding' | 'process';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action_items: string[];
  }>;
}

interface FileUploadResponse {
  file_id: string;
  status: string;
  message: string;
}

export default function ExcelFileProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingMode, setProcessingMode] = useState<'auto' | 'manual'>('auto');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<FileUploadResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('processing_mode', processingMode);
      formData.append('selected_columns', JSON.stringify(selectedColumns));

      const response = await fetch('/api/integration/excel/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSelectedFile(null);
      // Start polling for processing status
      queryClient.invalidateQueries({ queryKey: ['processing-status', data.file_id] });
    }
  });

  // Processing status query
  const { data: processingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['processing-status', uploadMutation.data?.file_id],
    queryFn: async () => {
      if (!uploadMutation.data?.file_id) return null;
      
      const response = await fetch(`/api/integration/excel/status/${uploadMutation.data.file_id}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json();
    },
    enabled: !!uploadMutation.data?.file_id,
    refetchInterval: (data) => {
      // Stop polling when processing is complete
      return (data as any)?.status === 'processing' ? 2000 : false;
    }
  });

  // Processing history query
  const { data: processingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['processing-history'],
    queryFn: async () => {
      const response = await fetch('/api/integration/excel/history');
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
    },
    staleTime: 5 * 60 * 1000
  });

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File must be Excel (.xlsx, .xls) or CSV format' };
    }

    return { valid: true };
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
      } else {
        alert(validation.error);
      }
    }
  }, [validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
      } else {
        alert(validation.error);
      }
    }
  }, [validateFile]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  }, [selectedFile, uploadMutation]);

  const renderProcessingStatus = () => {
    if (!processingStatus) return null;

    const result = processingStatus as ProcessingResult;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} />
            Processing: {result.filename}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
              {result.status.toUpperCase()}
            </Badge>
          </div>
          
          <Progress value={result.progress} className="w-full" />
          
          {result.status === 'completed' && (
            <div className="space-y-4">
              {/* File Insights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{result.insights.total_rows}</div>
                  <div className="text-sm text-gray-600">Rows</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{result.insights.total_columns}</div>
                  <div className="text-sm text-gray-600">Columns</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {result.insights.data_quality_score.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Quality Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {result.processing_time.toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Process Time</div>
                </div>
              </div>

              {/* Data Issues */}
              {(result.insights.missing_values > 0 || result.insights.duplicate_rows > 0) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Data quality issues detected: {result.insights.missing_values} missing values, {result.insights.duplicate_rows} duplicate rows
                  </AlertDescription>
                </Alert>
              )}

              {/* Extracted Data Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Users size={24} className="mx-auto text-blue-600 mb-2" />
                  <div className="font-semibold">{result.extracted_data.sponsors.length}</div>
                  <div className="text-sm text-gray-600">Sponsors</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Target size={24} className="mx-auto text-green-600 mb-2" />
                  <div className="font-semibold">{result.extracted_data.grants.length}</div>
                  <div className="text-sm text-gray-600">Grants</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Database size={24} className="mx-auto text-purple-600 mb-2" />
                  <div className="font-semibold">{result.extracted_data.relationships.length}</div>
                  <div className="text-sm text-gray-600">Relationships</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <DollarSign size={24} className="mx-auto text-orange-600 mb-2" />
                  <div className="font-semibold">{result.extracted_data.financial_data.length}</div>
                  <div className="text-sm text-gray-600">Financial Records</div>
                </div>
              </div>
            </div>
          )}

          {result.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processing failed. Please check file format and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderExtractedData = () => {
    if (!processingStatus || processingStatus.status !== 'completed') return null;

    const result = processingStatus as ProcessingResult;

    return (
      <Tabs defaultValue="sponsors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="sponsors" className="space-y-4">
          <div className="space-y-3">
            {result.extracted_data.sponsors.slice(0, 10).map((sponsor, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{sponsor.name}</h4>
                      <p className="text-sm text-gray-600">{sponsor.type}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">Tier {sponsor.tier}</Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        ${sponsor.funding_capacity.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {result.extracted_data.sponsors.length > 10 && (
              <p className="text-center text-sm text-gray-600">
                Showing 10 of {result.extracted_data.sponsors.length} sponsors
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="grants" className="space-y-4">
          <div className="space-y-3">
            {result.extracted_data.grants.slice(0, 10).map((grant, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{grant.title}</h4>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(grant.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${grant.amount.toLocaleString()}</div>
                      <Badge variant={grant.status === 'active' ? 'default' : 'secondary'}>
                        {grant.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {result.extracted_data.grants.length > 10 && (
              <p className="text-center text-sm text-gray-600">
                Showing 10 of {result.extracted_data.grants.length} grants
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <div className="space-y-3">
            {result.extracted_data.relationships.slice(0, 10).map((relationship, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {relationship.source} → {relationship.target}
                      </div>
                      <div className="text-sm text-gray-600">{relationship.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{relationship.strength.toFixed(1)}%</div>
                      <div className="text-sm text-gray-600">Strength</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {result.extracted_data.relationships.length > 10 && (
              <p className="text-center text-sm text-gray-600">
                Showing 10 of {result.extracted_data.relationships.length} relationships
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="space-y-3">
            {result.extracted_data.financial_data.slice(0, 10).map((financial, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{financial.category}</h4>
                      <p className="text-sm text-gray-600">{financial.notes}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${financial.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(financial.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {result.extracted_data.financial_data.length > 10 && (
              <p className="text-center text-sm text-gray-600">
                Showing 10 of {result.extracted_data.financial_data.length} financial records
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  const renderRecommendations = () => {
    if (!processingStatus || processingStatus.status !== 'completed') return null;

    const result = processingStatus as ProcessingResult;

    return (
      <div className="space-y-4">
        <h4 className="font-semibold">AI-Powered Recommendations</h4>
        {result.recommendations.map((rec, index) => (
          <Alert key={index}>
            <div className="flex items-start gap-3">
              <div className={`
                w-3 h-3 rounded-full mt-0.5
                ${rec.priority === 'high' ? 'bg-red-500' :
                  rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}
              `} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="font-medium">{rec.title}</h5>
                  <Badge variant="outline" className="text-xs">
                    {rec.type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                <div className="space-y-1">
                  <h6 className="text-sm font-medium">Action Items:</h6>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {rec.action_items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} />
            Excel File Processor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="data">Extracted Data</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                  ${selectedFile ? 'border-green-500 bg-green-50' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <CheckCircle size={48} className="mx-auto text-green-600" />
                    <div>
                      <h3 className="font-semibold">{selectedFile.name}</h3>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload size={16} className="mr-2" />
                            Process File
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedFile(null)}
                        disabled={uploadMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload size={48} className="mx-auto text-gray-400" />
                    <div>
                      <h3 className="font-semibold">Upload Excel File</h3>
                      <p className="text-sm text-gray-600">
                        Drag and drop your Excel file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Supports .xlsx, .xls, and .csv files up to 10MB
                      </p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <FileText size={16} className="mr-2" />
                      Browse Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Processing Options */}
              <div className="space-y-4">
                <h4 className="font-semibold">Processing Options</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="auto"
                      checked={processingMode === 'auto'}
                      onChange={(e) => setProcessingMode(e.target.value as 'auto')}
                    />
                    <span>Auto-detect data structure</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="manual"
                      checked={processingMode === 'manual'}
                      onChange={(e) => setProcessingMode(e.target.value as 'manual')}
                    />
                    <span>Manual column mapping</span>
                  </label>
                </div>
              </div>

              {/* Current Processing Status */}
              {uploadMutation.data && renderProcessingStatus()}
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              {renderExtractedData()}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {renderRecommendations()}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading processing history...</p>
                </div>
              ) : processingHistory?.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Processing History</h4>
                  {processingHistory.map((item: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{item.filename}</h5>
                            <p className="text-sm text-gray-600">
                              Processed: {new Date(item.processed_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.insights?.total_rows} rows
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No processing history available.</p>
                  <p className="text-sm text-gray-500">Upload your first Excel file to get started.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}