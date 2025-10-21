'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Container, Paper, Title, Textarea, Button, FileInput, Text, Stack, Box, ScrollArea, Switch, NumberInput, Group, Badge, Modal, TextInput } from '@mantine/core';
import { IconUpload, IconSend, IconX, IconDeviceFloppy, IconChartBar, IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useRouter } from 'next/navigation';
import VegaLiteChart from './VegaLiteChart';

interface ChatComponentProps {
  password: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRow = Record<string, any>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadedFile {
  name: string;
  data: DataRow[];
}

export default function ChatComponent({ password }: ChatComponentProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [vegaSpec, setVegaSpec] = useState<object | null>(null);
  const [plotHistory, setPlotHistory] = useState<object[]>([]);
  const [currentPlotIndex, setCurrentPlotIndex] = useState<number>(-1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[] | null>(null);
  const [useEntireDataset, setUseEntireDataset] = useState(false);
  const [maxRows, setMaxRows] = useState<number>(1000);
  const [leftPanelSize, setLeftPanelSize] = useState<number>(100);
  const [saveModalOpened, setSaveModalOpened] = useState(false);
  const [plotName, setPlotName] = useState('');
  const [savingPlot, setSavingPlot] = useState(false);

  // Update panel sizes when vegaSpec changes
  useEffect(() => {
    if (vegaSpec && leftPanelSize === 100) {
      // First plot created, adjust to default split
      setLeftPanelSize(45);
    } else if (!vegaSpec) {
      // No plot, reset to full width
      setLeftPanelSize(100);
    }
  }, [vegaSpec, leftPanelSize]);

  const parseFile = async (file: File): Promise<DataRow[]> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    return new Promise((resolve, reject) => {
      if (extension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            resolve(results.data as DataRow[]);
          },
          error: (error) => {
            reject(error);
          }
        });
      } else if (extension === 'tsv' || extension === 'txt') {
        // Parse TSV (tab-separated values)
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          delimiter: '\t',
          complete: (results) => {
            resolve(results.data as DataRow[]);
          },
          error: (error) => {
            reject(error);
          }
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        // Parse Excel
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData as DataRow[]);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
      } else {
        reject(new Error(`Unsupported file type: ${extension}`));
      }
    });
  };

  const handleFileUpload = async (files: File | File[] | null) => {
    if (!files) {
      setUploadedFiles([]);
      setSelectedColumns(null);
      return;
    }

    const fileArray = Array.isArray(files) ? files : [files];
    setSelectedColumns(null); // Reset column selection when new files are uploaded

    try {
      const parsedFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        // Skip if file with same name already exists
        if (uploadedFiles.some(f => f.name === file.name)) {
          continue;
        }

        const data = await parseFile(file);
        parsedFiles.push({
          name: file.name,
          data: data
        });
      }

      // Append new files to existing ones
      setUploadedFiles(prev => [...prev, ...parsedFiles]);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file: ' + error);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    if (uploadedFiles.length === 1) {
      setSelectedColumns(null);
    }
  };

  const addPlotToHistory = (spec: object) => {
    setPlotHistory(prev => [...prev, spec]);
    setCurrentPlotIndex(prev => prev + 1);
    setVegaSpec(spec);
  };

  const navigatePlotHistory = (direction: 'back' | 'forward') => {
    if (direction === 'back' && currentPlotIndex > 0) {
      const newIndex = currentPlotIndex - 1;
      setCurrentPlotIndex(newIndex);
      setVegaSpec(plotHistory[newIndex]);
    } else if (direction === 'forward' && currentPlotIndex < plotHistory.length - 1) {
      const newIndex = currentPlotIndex + 1;
      setCurrentPlotIndex(newIndex);
      setVegaSpec(plotHistory[newIndex]);
    }
  };

  const handleSavePlot = async () => {
    if (!plotName.trim() || !vegaSpec) {
      return;
    }

    setSavingPlot(true);

    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plot_name: plotName.trim(),
          plot_json: vegaSpec
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('Plot saved successfully!');
        setSaveModalOpened(false);
        setPlotName('');
      } else {
        alert(`Error saving plot: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error: Failed to save plot: ' + error);
    } finally {
      setSavingPlot(false);
    }
  };

  const extractVegaSpec = (text: string): { spec: object | null; cleanedText: string } => {
    // Look for JSON code blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);

    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        // Check if it has a $schema field indicating it's a Vega-Lite spec
        if (parsed.$schema && parsed.$schema.includes('vega-lite')) {
          // Remove the Vega-Lite JSON block from the text
          const cleanedText = text.replace(jsonBlockRegex, '').trim();
          return { spec: parsed, cleanedText };
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    }

    return { spec: null, cleanedText: text };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    const currentMessage = message;
    setMessage(''); // Clear input immediately
    setLoading(true);

    // Prepare data from all uploaded files: combine and limit rows
    let combinedData: DataRow[] | undefined = undefined;

    if (uploadedFiles.length > 0) {
      // Combine all files' data
      combinedData = uploadedFiles.flatMap(file => file.data);

      // Apply row limit
      if (!useEntireDataset && combinedData) {
        combinedData = combinedData.slice(0, maxRows);
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          csvData: combinedData,
          password,
          conversationHistory,
          selectedColumns,
          maxRows: useEntireDataset ? undefined : maxRows
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const responseText = data.response;

        // Check if response was truncated
        if (data.truncated) {
          alert('⚠️ Warning: Response was truncated due to length. The visualization may be incomplete. Try:\n- Reducing the number of rows\n- Using a simpler request\n- Breaking it into multiple questions');
        }

        // Check if this is a column selection response
        if (data.selectedColumns && Array.isArray(data.selectedColumns)) {
          // Step 1 complete: columns selected by Claude
          setSelectedColumns(data.selectedColumns);

          // Add to conversation showing column selection
          setConversationHistory(prev => [
            ...prev,
            { role: 'user', content: currentMessage },
            { role: 'assistant', content: `I've selected the following columns for this analysis: ${data.selectedColumns.join(', ')}\n\nNow fetching the data...` }
          ]);

          // Automatically make the second request with selected columns
          setLoading(true);
          const res2 = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: currentMessage,
              csvData: combinedData,
              password,
              conversationHistory: [
                ...conversationHistory,
                { role: 'user', content: currentMessage },
                { role: 'assistant', content: `I've selected the following columns: ${data.selectedColumns.join(', ')}` }
              ],
              selectedColumns: data.selectedColumns,
              maxRows: useEntireDataset ? undefined : maxRows
            }),
          });

          const data2 = await res2.json();

          if (res2.ok) {
            const responseText2 = data2.response;

            // Check if second response was truncated
            if (data2.truncated) {
              alert('⚠️ Warning: Response was truncated due to length. The visualization may be incomplete. Try:\n- Reducing the number of rows\n- Using a simpler request\n- Breaking it into multiple questions');
            }

            const { spec, cleanedText } = extractVegaSpec(responseText2);

            // Update conversation with the actual analysis
            setConversationHistory(prev => [
              ...prev,
              { role: 'assistant', content: cleanedText }
            ]);

            if (spec) {
              addPlotToHistory(spec);
            }
          }
        } else {
          // Normal response (not column selection)
          const { spec, cleanedText } = extractVegaSpec(responseText);

          setConversationHistory(prev => [
            ...prev,
            { role: 'user', content: currentMessage },
            { role: 'assistant', content: cleanedText }
          ]);

          if (spec) {
            addPlotToHistory(spec);
          }
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Error: Failed to connect to the API: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="md" style={{ height: '100vh', maxHeight: '100vh' }}>
      <Group justify="space-between" mb="md">
        <Title order={1}>Data Analysis App</Title>
        <Button
          leftSection={<IconChartBar size={16} />}
          onClick={() => router.push('/plots')}
          variant="light"
        >
          View Saved Plots
        </Button>
      </Group>

      <div style={{ height: 'calc(100vh - 100px)' }}>
        <PanelGroup direction="horizontal">
          {/* Left side: Chat interface */}
          <Panel defaultSize={leftPanelSize} minSize={30}>
            <Stack gap="md" style={{ height: '100%', paddingRight: vegaSpec ? '8px' : '0' }}>
            {/* File upload section */}
            <Paper shadow="sm" p="md" radius="md">
              <Stack gap="sm">
                <FileInput
                  label="Upload Data Files (optional)"
                  placeholder="Click to upload CSV, TSV, or Excel files"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  leftSection={<IconUpload size={16} />}
                  multiple
                  clearable
                />
                {uploadedFiles.length > 0 && (
                  <>
                    <Box>
                      <Text size="sm" fw={500} mb="xs">
                        Uploaded Files:
                      </Text>
                      <Stack gap="xs">
                        {uploadedFiles.map((file) => (
                          <Group key={file.name} justify="space-between">
                            <Badge variant="light" size="lg">
                              {file.name} ({file.data.length} rows)
                            </Badge>
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={() => removeFile(file.name)}
                              disabled={loading}
                            >
                              <IconX size={14} />
                            </Button>
                          </Group>
                        ))}
                      </Stack>
                      <Text size="sm" c="dimmed" mt="xs">
                        Total: {uploadedFiles.reduce((sum, f) => sum + f.data.length, 0)} rows across {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                      </Text>
                    </Box>

                    <Group gap="md">
                      <Switch
                        label="Use entire dataset"
                        checked={useEntireDataset}
                        onChange={(e) => setUseEntireDataset(e.currentTarget.checked)}
                        disabled={loading}
                      />
                      {!useEntireDataset && (
                        <NumberInput
                          label="Max rows to send"
                          value={maxRows}
                          onChange={(val) => setMaxRows(typeof val === 'number' ? val : 1000)}
                          min={10}
                          max={uploadedFiles.reduce((sum, f) => sum + f.data.length, 0)}
                          step={100}
                          disabled={loading}
                          style={{ flex: 1 }}
                        />
                      )}
                    </Group>

                    <Text size="xs" c="dimmed">
                      {useEntireDataset
                        ? `Sending all ${uploadedFiles.reduce((sum, f) => sum + f.data.length, 0)} rows (may increase costs)`
                        : `Sending first ${maxRows} rows (recommended for efficiency)`
                      }
                    </Text>
                  </>
                )}
              </Stack>
            </Paper>

            {/* Conversation history */}
            <Paper shadow="sm" p="md" radius="md" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Title order={3} mb="md">Conversation</Title>
              <ScrollArea style={{ flex: 1 }} offsetScrollbars>
                <Stack gap="md">
                  {conversationHistory.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      Start a conversation by typing a message below...
                    </Text>
                  ) : (
                    conversationHistory.map((msg, idx) => (
                      <Box key={idx}>
                        <Text size="sm" fw={600} c={msg.role === 'user' ? 'blue' : 'green'} mb={4}>
                          {msg.role === 'user' ? 'You' : 'Claude'}
                        </Text>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </Text>
                      </Box>
                    ))
                  )}
                  {loading && (
                    <Box>
                      <Text size="sm" fw={600} c="green" mb={4}>
                        Claude
                      </Text>
                      <Text size="sm" c="dimmed">
                        Thinking...
                      </Text>
                    </Box>
                  )}
                </Stack>
              </ScrollArea>
            </Paper>

            {/* Message input */}
            <Paper shadow="sm" p="md" radius="md">
              <form onSubmit={handleSubmit}>
                <Stack gap="sm">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.currentTarget.value)}
                    placeholder="Type your message... (e.g., 'Create a bar chart' or 'Make the bars blue')"
                    minRows={3}
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !message.trim()}
                    fullWidth
                    leftSection={<IconSend size={16} />}
                    loading={loading}
                  >
                    Send Message
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Stack>
        </Panel>

        {/* Resize handle (only shown when plot exists) */}
        {vegaSpec && (
          <>
            <PanelResizeHandle style={{
              width: '4px',
              background: '#e0e0e0',
              cursor: 'col-resize',
              transition: 'background 0.2s',
            }} />

            {/* Right side: Visualization */}
            <Panel defaultSize={55} minSize={20}>
              <div style={{ height: '100%', paddingLeft: '8px' }}>
                <Paper shadow="sm" p="md" radius="md" style={{ height: '100%', overflow: 'auto' }}>
                  <Group justify="space-between" mb="md">
                    <Title order={3}>Current Visualization</Title>
                    <Group gap="xs">
                      <Button.Group>
                        <Button
                          leftSection={<IconArrowLeft size={16} />}
                          onClick={() => navigatePlotHistory('back')}
                          variant="light"
                          size="sm"
                          disabled={currentPlotIndex <= 0}
                        >
                          Back
                        </Button>
                        <Button
                          rightSection={<IconArrowRight size={16} />}
                          onClick={() => navigatePlotHistory('forward')}
                          variant="light"
                          size="sm"
                          disabled={currentPlotIndex >= plotHistory.length - 1}
                        >
                          Forward
                        </Button>
                      </Button.Group>
                      <Button
                        leftSection={<IconDeviceFloppy size={16} />}
                        onClick={() => setSaveModalOpened(true)}
                        variant="light"
                        size="sm"
                      >
                        Save Plot
                      </Button>
                    </Group>
                  </Group>
                  <Box>
                    <VegaLiteChart spec={vegaSpec} />
                  </Box>
                </Paper>
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
      </div>

      {/* Save Plot Modal */}
      <Modal
        opened={saveModalOpened}
        onClose={() => {
          setSaveModalOpened(false);
          setPlotName('');
        }}
        title="Save Plot"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Plot Name"
            placeholder="Enter a name for this plot"
            value={plotName}
            onChange={(e) => setPlotName(e.currentTarget.value)}
            disabled={savingPlot}
            data-autofocus
          />
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => {
                setSaveModalOpened(false);
                setPlotName('');
              }}
              disabled={savingPlot}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePlot}
              disabled={!plotName.trim() || savingPlot}
              loading={savingPlot}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
