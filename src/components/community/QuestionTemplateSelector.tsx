'use client';

import { useState, useEffect } from 'react';

interface TemplateField {
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  fields: Record<string, TemplateField>;
  usage_count: number;
  created_by_user: {
    id: string;
    name: string;
  };
}

interface QuestionTemplateSelectorProps {
  category: string;
  onTemplateSelect: (template: QuestionTemplate | null) => void;
  onTemplateDataChange: (data: Record<string, string>) => void;
  selectedTemplate: QuestionTemplate | null;
}

export default function QuestionTemplateSelector({
  category,
  onTemplateSelect,
  onTemplateDataChange,
  selectedTemplate
}: QuestionTemplateSelectorProps) {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category && category !== 'general') {
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [category]);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateData({});
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/qa/categories/templates?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(data.data.templates || []);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: QuestionTemplate) => {
    if (selectedTemplate?.id === template.id) {
      onTemplateSelect(null);
      setTemplateData({});
    } else {
      onTemplateSelect(template);
      setTemplateData({});
    }
  };

  const handleFieldChange = (fieldKey: string, value: string) => {
    const newData = {
      ...templateData,
      [fieldKey]: value
    };
    setTemplateData(newData);
    onTemplateDataChange(newData);
  };

  const renderField = (fieldKey: string, field: TemplateField) => {
    const value = templateData[fieldKey] || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder={field.label}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder={field.label}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder={field.label}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={fieldKey}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  required={field.required}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (category === 'general' || (!templates.length && !loading)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center mb-3">
        <span className="mr-2">📋</span>
        <h3 className="text-sm font-medium text-gray-900">Question Templates</h3>
        {loading && (
          <div className="ml-2 w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {!loading && templates.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Using a template helps structure your question for better answers
          </p>

          {/* Template Options */}
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`w-full p-3 rounded-md border-2 text-left transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-gray-500">{template.description}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Used {template.usage_count} times
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Template Form */}
          {selectedTemplate && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  {selectedTemplate.name} Template
                </h4>
                <button
                  onClick={() => {
                    onTemplateSelect(null);
                    setTemplateData({});
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedTemplate.fields).map(([fieldKey, field]) => (
                  <div key={fieldKey}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderField(fieldKey, field)}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Fill out these fields to provide structured information for better answers
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-4">
          <div className="text-gray-400 text-sm">
            No templates available for this category yet
          </div>
        </div>
      )}
    </div>
  );
}