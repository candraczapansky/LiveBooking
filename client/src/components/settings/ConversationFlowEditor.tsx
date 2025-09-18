import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  IconButton,
  Typography,
  Box,
  Chip,
  Alert,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PlayArrow as TestIcon
} from '@mui/icons-material';

interface FlowBranch {
  keywords: string[];
  response?: string;
  nextNodeId?: number;
}

interface ConversationFlow {
  id?: number;
  name: string;
  nodeType: 'greeting' | 'question' | 'response' | 'end';
  message: string;
  parentId?: number | null;
  branches?: FlowBranch[];
  isActive: boolean;
  isRoot: boolean;
  timeout: number;
  speechTimeout: number;
  orderIndex: number;
}

export default function ConversationFlowEditor() {
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<ConversationFlow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voice-conversation-flows', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch flows');
      const data = await response.json();
      setFlows(data);
    } catch (err) {
      setError('Failed to load conversation flows');
      console.error('Error fetching flows:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlow = async () => {
    if (!selectedFlow) return;

    try {
      setLoading(true);
      const url = selectedFlow.id 
        ? `/api/voice-conversation-flows/${selectedFlow.id}`
        : '/api/voice-conversation-flows';
      
      const method = selectedFlow.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(selectedFlow)
      });

      if (!response.ok) throw new Error('Failed to save flow');
      
      setSuccess('Flow saved successfully');
      await fetchFlows();
      setEditMode(false);
    } catch (err) {
      setError('Failed to save flow');
      console.error('Error saving flow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (id: number) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/voice-conversation-flows/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete flow');
      
      setSuccess('Flow deleted successfully');
      await fetchFlows();
      if (selectedFlow?.id === id) {
        setSelectedFlow(null);
      }
    } catch (err) {
      setError('Failed to delete flow');
      console.error('Error deleting flow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestFlow = async () => {
    try {
      const response = await fetch('/api/voice-conversation-flows/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          input: testInput,
          nodeId: selectedFlow?.id
        })
      });

      if (!response.ok) throw new Error('Failed to test flow');
      
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError('Failed to test flow');
      console.error('Error testing flow:', err);
    }
  };

  const handleAddBranch = () => {
    if (!selectedFlow) return;
    
    const newBranch: FlowBranch = {
      keywords: [],
      response: '',
      nextNodeId: undefined
    };
    
    setSelectedFlow({
      ...selectedFlow,
      branches: [...(selectedFlow.branches || []), newBranch]
    });
  };

  const handleUpdateBranch = (index: number, branch: FlowBranch) => {
    if (!selectedFlow) return;
    
    const branches = [...(selectedFlow.branches || [])];
    branches[index] = branch;
    
    setSelectedFlow({
      ...selectedFlow,
      branches
    });
  };

  const handleRemoveBranch = (index: number) => {
    if (!selectedFlow) return;
    
    const branches = [...(selectedFlow.branches || [])];
    branches.splice(index, 1);
    
    setSelectedFlow({
      ...selectedFlow,
      branches
    });
  };

  const createNewFlow = () => {
    setSelectedFlow({
      name: 'New Flow Node',
      nodeType: 'response',
      message: '',
      isActive: true,
      isRoot: false,
      timeout: 10,
      speechTimeout: 3,
      orderIndex: flows.length,
      branches: []
    });
    setEditMode(true);
  };

  return (
    <div>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">AI Voice Responder - Conversation Flows</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={createNewFlow}
          disabled={loading}
        >
          Create New Flow
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Flow List */}
        <Grid item xs={12} md={4}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Flow Nodes</Typography>
              <Typography variant="caption" color="textSecondary">
                Manage your AI conversation flows
              </Typography>
            </Box>
            <Divider />
            <List>
              {flows.map((flow) => (
                <ListItem
                  key={flow.id}
                  button
                  selected={selectedFlow?.id === flow.id}
                  onClick={() => {
                    setSelectedFlow(flow);
                    setEditMode(false);
                    setTestResult(null);
                  }}
                >
                  <ListItemText
                    primary={flow.name}
                    secondary={
                      <Box>
                        <Chip 
                          label={flow.nodeType} 
                          size="small" 
                          color={flow.isRoot ? 'primary' : 'default'}
                          sx={{ mr: 1 }}
                        />
                        {flow.isRoot && (
                          <Chip 
                            label="ROOT" 
                            size="small" 
                            color="secondary" 
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              
              {flows.length === 0 && (
                <ListItem>
                  <ListItemText 
                    primary="No flows created yet"
                    secondary="Click 'Create New Flow' to get started"
                  />
                </ListItem>
              )}
            </List>
          </Card>
        </Grid>

        {/* Flow Editor */}
        <Grid item xs={12} md={8}>
          {selectedFlow ? (
            <Card>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  {editMode ? 'Edit' : 'View'} Flow Node
                </Typography>
                <Box>
                  {!editMode ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => setEditMode(true)}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSaveFlow}
                        color="primary"
                        disabled={loading}
                      >
                        Save
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        onClick={() => {
                          setEditMode(false);
                          if (!selectedFlow.id) {
                            setSelectedFlow(null);
                          }
                        }}
                        sx={{ ml: 1 }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      {selectedFlow.id && (
                        <IconButton
                          onClick={() => handleDeleteFlow(selectedFlow.id!)}
                          color="error"
                          disabled={loading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </Box>
              </Box>
              <Divider />
              
              <Box sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Node Name"
                      value={selectedFlow.name}
                      onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                      disabled={!editMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editMode}>
                      <InputLabel>Node Type</InputLabel>
                      <Select
                        value={selectedFlow.nodeType}
                        onChange={(e) => setSelectedFlow({ 
                          ...selectedFlow, 
                          nodeType: e.target.value as any 
                        })}
                        label="Node Type"
                      >
                        <MenuItem value="greeting">Greeting</MenuItem>
                        <MenuItem value="question">Question</MenuItem>
                        <MenuItem value="response">Response</MenuItem>
                        <MenuItem value="end">End</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="AI Message"
                      value={selectedFlow.message}
                      onChange={(e) => setSelectedFlow({ ...selectedFlow, message: e.target.value })}
                      disabled={!editMode}
                      helperText="This is exactly what the AI will say"
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Timeout (seconds)"
                      value={selectedFlow.timeout}
                      onChange={(e) => setSelectedFlow({ 
                        ...selectedFlow, 
                        timeout: parseInt(e.target.value) || 10
                      })}
                      disabled={!editMode}
                      helperText="How long to wait for response"
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Speech Timeout (seconds)"
                      value={selectedFlow.speechTimeout}
                      onChange={(e) => setSelectedFlow({ 
                        ...selectedFlow, 
                        speechTimeout: parseInt(e.target.value) || 3
                      })}
                      disabled={!editMode}
                      helperText="Silence before AI continues"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={selectedFlow.isRoot}
                          onChange={(e) => setSelectedFlow({ 
                            ...selectedFlow, 
                            isRoot: e.target.checked 
                          })}
                          disabled={!editMode}
                        />
                      }
                      label="Root Node (Conversation starts here)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={selectedFlow.isActive}
                          onChange={(e) => setSelectedFlow({ 
                            ...selectedFlow, 
                            isActive: e.target.checked 
                          })}
                          disabled={!editMode}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                </Grid>

                {/* Response Branches */}
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Response Branches</Typography>
                    {editMode && (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddBranch}
                      >
                        Add Branch
                      </Button>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Define how the AI responds to different customer inputs
                  </Typography>
                  
                  {selectedFlow.branches?.map((branch, index) => (
                    <Card key={index} sx={{ mb: 2, p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Keywords (comma separated)"
                            value={branch.keywords.join(', ')}
                            onChange={(e) => {
                              const keywords = e.target.value
                                .split(',')
                                .map(k => k.trim())
                                .filter(k => k);
                              handleUpdateBranch(index, { ...branch, keywords });
                            }}
                            disabled={!editMode}
                            helperText="Words that trigger this response"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Response"
                            value={branch.response || ''}
                            onChange={(e) => {
                              handleUpdateBranch(index, { ...branch, response: e.target.value });
                            }}
                            disabled={!editMode}
                            helperText="What the AI says when these keywords are detected"
                          />
                        </Grid>
                        {editMode && (
                          <Grid item xs={12}>
                            <Button
                              color="error"
                              size="small"
                              onClick={() => handleRemoveBranch(index)}
                            >
                              Remove Branch
                            </Button>
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  ))}
                  
                  {(!selectedFlow.branches || selectedFlow.branches.length === 0) && (
                    <Typography variant="body2" color="textSecondary">
                      No branches defined. Add branches to handle different customer responses.
                    </Typography>
                  )}
                </Box>

                {/* Test Section */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Test This Flow</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={8}>
                      <TextField
                        fullWidth
                        label="Test Input"
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="Type what a customer might say..."
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<TestIcon />}
                        onClick={handleTestFlow}
                        sx={{ height: '56px' }}
                      >
                        Test
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {testResult && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        <strong>AI Response:</strong>
                      </Typography>
                      <Typography sx={{ mb: 1 }}>{testResult.message}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Should End: {testResult.shouldEnd ? 'Yes (Conversation ends)' : 'No (Continues listening)'}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Box>
            </Card>
          ) : (
            <Card>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="textSecondary">
                  Select a flow node from the list or create a new one
                </Typography>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>
    </div>
  );
}

