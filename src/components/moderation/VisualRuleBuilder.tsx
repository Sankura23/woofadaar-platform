'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RuleCondition {
  id: string;
  type: 'content_analysis' | 'user_reputation' | 'user_history' | 'time_based' | 'content_metadata';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  field: string;
  value: any;
  weight: number;
}

interface RuleAction {
  id: string;
  type: 'block' | 'flag' | 'review' | 'warn' | 'restrict' | 'notify' | 'assign' | 'escalate';
  target: 'content' | 'user' | 'moderator';
  parameters: {
    duration?: number;
    reason?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    assignTo?: string;
    notificationTemplate?: string;
    escalationLevel?: number;
  };
}

interface ModerationRule {
  id?: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  triggerEvent: string;
  triggerFrequency: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

const CONDITION_TYPES = {
  content_analysis: {
    label: 'Content Analysis',
    icon: '🔍',
    fields: {
      spam_score: { label: 'Spam Score', type: 'number', range: [0, 100] },
      toxicity_score: { label: 'Toxicity Score', type: 'number', range: [0, 100] },
      quality_score: { label: 'Quality Score', type: 'number', range: [0, 100] },
      readability_score: { label: 'Readability Score', type: 'number', range: [0, 100] },
      has_spam_keywords: { label: 'Has Spam Keywords', type: 'boolean' },
      has_toxic_language: { label: 'Has Toxic Language', type: 'boolean' },
      language_detected: { label: 'Language', type: 'select', options: ['english', 'hindi', 'hinglish'] },
      sentiment: { label: 'Sentiment', type: 'select', options: ['positive', 'negative', 'neutral'] }
    }
  },
  user_reputation: {
    label: 'User Reputation',
    icon: '⭐',
    fields: {
      overall_reputation: { label: 'Overall Reputation', type: 'number', range: [0, 1000] },
      trust_level: { label: 'Trust Level', type: 'select', options: ['restricted', 'new', 'trusted', 'expert', 'moderator', 'admin'] },
      content_quality_avg: { label: 'Average Content Quality', type: 'number', range: [0, 100] },
      community_helpfulness: { label: 'Community Helpfulness', type: 'number', range: [0, 100] },
      moderation_history: { label: 'Moderation History Score', type: 'number', range: [0, 100] },
      expert_status: { label: 'Is Expert', type: 'boolean' }
    }
  },
  user_history: {
    label: 'User History',
    icon: '📊',
    fields: {
      violations_30d: { label: 'Violations (30 days)', type: 'number', range: [0, 50] },
      warnings_7d: { label: 'Warnings (7 days)', type: 'number', range: [0, 20] },
      successful_reports: { label: 'Successful Reports', type: 'number', range: [0, 100] },
      false_reports: { label: 'False Reports', type: 'number', range: [0, 50] },
      days_since_last_violation: { label: 'Days Since Last Violation', type: 'number', range: [0, 365] }
    }
  },
  time_based: {
    label: 'Time Based',
    icon: '⏰',
    fields: {
      hour_of_day: { label: 'Hour of Day', type: 'number', range: [0, 23] },
      day_of_week: { label: 'Day of Week', type: 'select', options: ['0', '1', '2', '3', '4', '5', '6'], labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      is_weekend: { label: 'Is Weekend', type: 'boolean' },
      is_business_hours: { label: 'Business Hours (9-17)', type: 'boolean' }
    }
  },
  content_metadata: {
    label: 'Content Metadata',
    icon: '📝',
    fields: {
      content_length: { label: 'Content Length', type: 'number', range: [0, 10000] },
      word_count: { label: 'Word Count', type: 'number', range: [0, 2000] },
      has_links: { label: 'Contains Links', type: 'boolean' },
      has_emojis: { label: 'Contains Emojis', type: 'boolean' },
      language: { label: 'Language', type: 'select', options: ['english', 'hindi', 'hinglish'] },
      is_first_post: { label: 'Is First Post', type: 'boolean' }
    }
  }
};

const ACTION_TYPES = {
  block: { label: 'Block Content', icon: '🚫', targets: ['content'], severity: 'critical' },
  flag: { label: 'Flag for Review', icon: '🏁', targets: ['content'], severity: 'medium' },
  review: { label: 'Queue for Review', icon: '👀', targets: ['content'], severity: 'medium' },
  warn: { label: 'Warn User', icon: '⚠️', targets: ['user'], severity: 'low' },
  restrict: { label: 'Restrict User', icon: '🔒', targets: ['user'], severity: 'high' },
  notify: { label: 'Notify Moderators', icon: '📢', targets: ['moderator'], severity: 'medium' },
  assign: { label: 'Assign to Moderator', icon: '👤', targets: ['content'], severity: 'medium' },
  escalate: { label: 'Escalate to Admin', icon: '⬆️', targets: ['content'], severity: 'high' }
};

const OPERATORS = {
  equals: { label: 'equals', symbol: '=' },
  not_equals: { label: 'not equals', symbol: '≠' },
  greater_than: { label: 'greater than', symbol: '>' },
  less_than: { label: 'less than', symbol: '<' },
  contains: { label: 'contains', symbol: '⊃' },
  not_contains: { label: 'not contains', symbol: '⊅' },
  in: { label: 'is one of', symbol: '∈' },
  not_in: { label: 'is not one of', symbol: '∉' }
};

interface VisualRuleBuilderProps {
  initialRule?: ModerationRule;
  onSave: (rule: ModerationRule) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function VisualRuleBuilder({ initialRule, onSave, onCancel, isLoading = false }: VisualRuleBuilderProps) {
  const [rule, setRule] = useState<ModerationRule>(initialRule || {
    name: '',
    description: '',
    priority: 5,
    isActive: true,
    triggerEvent: 'content_posted',
    triggerFrequency: 'immediate',
    conditions: [],
    actions: []
  });

  const [testContent, setTestContent] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingRule, setIsTestingRule] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: `condition_${Date.now()}`,
      type: 'content_analysis',
      operator: 'greater_than',
      field: 'spam_score',
      value: 70,
      weight: 1.0
    };

    setRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const removeCondition = (conditionId: string) => {
    setRule(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };

  const updateCondition = (conditionId: string, updates: Partial<RuleCondition>) => {
    setRule(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }));
  };

  const addAction = () => {
    const newAction: RuleAction = {
      id: `action_${Date.now()}`,
      type: 'flag',
      target: 'content',
      parameters: {
        reason: rule.name,
        severity: 'medium'
      }
    };

    setRule(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const removeAction = (actionId: string) => {
    setRule(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId)
    }));
  };

  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    setRule(prev => ({
      ...prev,
      actions: prev.actions.map(a => 
        a.id === actionId ? { ...a, ...updates } : a
      )
    }));
  };

  const testRule = async () => {
    if (!testContent.trim() || rule.conditions.length === 0) return;

    setIsTestingRule(true);
    try {
      const token = localStorage.getItem('woofadaar_token');
      if (!token) {
        alert('Please log in to test rules');
        return;
      }

      // First create a temporary rule for testing
      const response = await fetch('/api/moderation/rules?action=test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data.data);
      } else {
        alert('Failed to test rule');
      }
    } catch (error) {
      console.error('Error testing rule:', error);
      alert('Error testing rule');
    } finally {
      setIsTestingRule(false);
    }
  };

  const handleSave = async () => {
    if (!rule.name.trim() || !rule.description.trim()) {
      alert('Please provide rule name and description');
      return;
    }

    if (rule.conditions.length === 0) {
      alert('Please add at least one condition');
      return;
    }

    if (rule.actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    await onSave(rule);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {initialRule ? '✏️ Edit Rule' : '🆕 Create New Rule'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Build custom moderation rules with visual conditions and actions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Basic' : 'Advanced'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Name *
            </label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => setRule(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Block Severe Toxicity from New Users"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority (1-10)
            </label>
            <select
              value={rule.priority}
              onChange={(e) => setRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num} {num >= 8 ? '(Critical)' : num >= 6 ? '(High)' : num >= 4 ? '(Medium)' : '(Low)'}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={rule.description}
              onChange={(e) => setRule(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this rule does and when it should trigger..."
            />
          </div>

          {showAdvanced && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Event
                </label>
                <select
                  value={rule.triggerEvent}
                  onChange={(e) => setRule(prev => ({ ...prev, triggerEvent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="content_posted">Content Posted</option>
                  <option value="content_reported">Content Reported</option>
                  <option value="user_action">User Action</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="threshold_reached">Threshold Reached</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing
                </label>
                <select
                  value={rule.triggerFrequency}
                  onChange={(e) => setRule(prev => ({ ...prev, triggerFrequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="immediate">Immediate</option>
                  <option value="batch_hourly">Batch (Hourly)</option>
                  <option value="batch_daily">Batch (Daily)</option>
                </select>
              </div>
            </>
          )}

          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={(e) => setRule(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Rule is active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">🎯 Conditions</h4>
            <button
              onClick={addCondition}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              + Add Condition
            </button>
          </div>

          <AnimatePresence>
            {rule.conditions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500"
              >
                <div className="text-4xl mb-2">🎯</div>
                <p>No conditions added yet</p>
                <p className="text-sm">Add conditions to define when this rule should trigger</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {rule.conditions.map((condition, index) => (
                  <motion.div
                    key={condition.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{CONDITION_TYPES[condition.type]?.icon}</span>
                        <span className="font-medium">{CONDITION_TYPES[condition.type]?.label}</span>
                        {index > 0 && <span className="text-gray-400">AND</span>}
                      </div>
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Condition Type */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={condition.type}
                          onChange={(e) => updateCondition(condition.id, { 
                            type: e.target.value as any,
                            field: Object.keys(CONDITION_TYPES[e.target.value as keyof typeof CONDITION_TYPES].fields)[0]
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(CONDITION_TYPES).map(([key, type]) => (
                            <option key={key} value={key}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Field */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Field</label>
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(CONDITION_TYPES[condition.type]?.fields || {}).map(([key, field]) => (
                            <option key={key} value={key}>{field.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Operator */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Operator</label>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, { operator: e.target.value as any })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(OPERATORS).map(([key, op]) => (
                            <option key={key} value={key}>{op.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Value */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Value</label>
                        {(() => {
                          const fieldConfig = CONDITION_TYPES[condition.type]?.fields[condition.field];
                          if (!fieldConfig) return null;

                          if (fieldConfig.type === 'boolean') {
                            return (
                              <select
                                value={condition.value ? 'true' : 'false'}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value === 'true' })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            );
                          } else if (fieldConfig.type === 'select') {
                            return (
                              <select
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {fieldConfig.options?.map((option, idx) => (
                                  <option key={option} value={option}>
                                    {fieldConfig.labels?.[idx] || option}
                                  </option>
                                ))}
                              </select>
                            );
                          } else {
                            return (
                              <input
                                type="number"
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
                                min={fieldConfig.range?.[0]}
                                max={fieldConfig.range?.[1]}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            );
                          }
                        })()}
                      </div>
                    </div>

                    {showAdvanced && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-500 mb-1">Weight (0.1 - 2.0)</label>
                        <input
                          type="range"
                          min="0.1"
                          max="2.0"
                          step="0.1"
                          value={condition.weight}
                          onChange={(e) => updateCondition(condition.id, { weight: parseFloat(e.target.value) })}
                          className="w-24"
                        />
                        <span className="ml-2 text-sm text-gray-600">{condition.weight}x</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">⚡ Actions</h4>
            <button
              onClick={addAction}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            >
              + Add Action
            </button>
          </div>

          <AnimatePresence>
            {rule.actions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-gray-500"
              >
                <div className="text-4xl mb-2">⚡</div>
                <p>No actions added yet</p>
                <p className="text-sm">Add actions to define what should happen when conditions are met</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {rule.actions.map((action) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{ACTION_TYPES[action.type]?.icon}</span>
                        <span className="font-medium">{ACTION_TYPES[action.type]?.label}</span>
                      </div>
                      <button
                        onClick={() => removeAction(action.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Action Type */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Action</label>
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(action.id, { 
                            type: e.target.value as any,
                            target: ACTION_TYPES[e.target.value as keyof typeof ACTION_TYPES]?.targets[0] as any
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(ACTION_TYPES).map(([key, actionType]) => (
                            <option key={key} value={key}>{actionType.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Target */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Target</label>
                        <select
                          value={action.target}
                          onChange={(e) => updateAction(action.id, { target: e.target.value as any })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {ACTION_TYPES[action.type]?.targets.map(target => (
                            <option key={target} value={target}>{target}</option>
                          ))}
                        </select>
                      </div>

                      {/* Severity */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Severity</label>
                        <select
                          value={action.parameters.severity || 'medium'}
                          onChange={(e) => updateAction(action.id, { 
                            parameters: { ...action.parameters, severity: e.target.value as any }
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    {/* Action Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Reason</label>
                        <input
                          type="text"
                          value={action.parameters.reason || ''}
                          onChange={(e) => updateAction(action.id, { 
                            parameters: { ...action.parameters, reason: e.target.value }
                          })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Reason for this action..."
                        />
                      </div>

                      {(action.type === 'restrict' || action.type === 'warn') && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Duration (hours)</label>
                          <input
                            type="number"
                            value={action.parameters.duration || 24}
                            onChange={(e) => updateAction(action.id, { 
                              parameters: { ...action.parameters, duration: parseInt(e.target.value) || 24 }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="1"
                            max="8760"
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Test Rule */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">🧪 Test Rule</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Content
              </label>
              <textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter content to test against this rule..."
              />
              <button
                onClick={testRule}
                disabled={isTestingRule || !testContent.trim() || rule.conditions.length === 0}
                className="mt-3 w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingRule ? 'Testing...' : '🧪 Test Rule'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Results
              </label>
              {testResults ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {testResults.summary?.rulesTriggered > 0 ? '✅ Rule Would Trigger' : '❌ Rule Would Not Trigger'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {testResults.summary?.totalProcessingTime}ms
                    </span>
                  </div>
                  
                  {testResults.summary?.actionsExecuted?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Actions:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {testResults.summary.actionsExecuted.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {testResults.summary?.reasons?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Reasons:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {testResults.summary.reasons.map((reason: string, idx: number) => (
                          <li key={idx} className="text-xs">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-gray-500">
                  <div className="text-2xl mb-2">🧪</div>
                  <p className="text-sm">Enter test content and click "Test Rule" to see how your rule performs</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}