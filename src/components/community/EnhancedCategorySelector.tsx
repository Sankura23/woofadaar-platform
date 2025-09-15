'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parent_id: string | null;
  subcategories: Category[];
  question_templates: any[];
  _count: {
    question_templates: number;
  };
}

interface EnhancedCategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export default function EnhancedCategorySelector({
  selectedCategory,
  onCategoryChange,
  className = ''
}: EnhancedCategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHierarchy, setShowHierarchy] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/qa/categories/hierarchy');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.data.categories || []);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to predefined categories
      setCategories([
        {
          id: 'health',
          name: 'health',
          description: 'Health, medical concerns, and veterinary questions',
          icon: '🏥',
          color: '#ef4444',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'behavior',
          name: 'behavior',
          description: 'Behavioral issues, training, and socialization',
          icon: '🐕',
          color: '#3b82f6',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'feeding',
          name: 'feeding',
          description: 'Diet, nutrition, and feeding questions',
          icon: '🍖',
          color: '#f59e0b',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'training',
          name: 'training',
          description: 'Training tips, commands, and education',
          icon: '🎓',
          color: '#10b981',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'local',
          name: 'local',
          description: 'Location-specific questions and local services',
          icon: '📍',
          color: '#8b5cf6',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        },
        {
          id: 'general',
          name: 'general',
          description: 'General dog care and miscellaneous questions',
          icon: '💬',
          color: '#6b7280',
          parent_id: null,
          subcategories: [],
          question_templates: [],
          _count: { question_templates: 0 }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    onCategoryChange(categoryName);
    setShowHierarchy(false);
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.name === selectedCategory);
  };

  const selectedCat = getSelectedCategory();

  return (
    <div className={className}>
      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
        Category *
      </label>
      
      {loading ? (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          Loading categories...
        </div>
      ) : (
        <>
          {/* Current Selection Display */}
          <button
            type="button"
            onClick={() => setShowHierarchy(!showHierarchy)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              {selectedCat && (
                <>
                  <span className="mr-2">{selectedCat.icon}</span>
                  <div className="text-left">
                    <div className="font-medium capitalize">{selectedCat.name}</div>
                    <div className="text-xs text-gray-500">{selectedCat.description}</div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center">
              {selectedCat?._count.question_templates > 0 && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full mr-2">
                  {selectedCat._count.question_templates} templates
                </span>
              )}
              <span className={`transition-transform ${showHierarchy ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </button>

          {/* Category Hierarchy */}
          {showHierarchy && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {categories.map((category) => (
                <div key={category.id}>
                  {/* Main Category */}
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(category.name)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                      selectedCategory === category.name ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    style={{
                      borderLeft: `4px solid ${category.color}`
                    }}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{category.icon}</span>
                      <div>
                        <div className="font-medium capitalize">{category.name}</div>
                        <div className="text-xs text-gray-500">{category.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {category._count.question_templates > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {category._count.question_templates}
                        </span>
                      )}
                      {selectedCategory === category.name && (
                        <span className="text-blue-600">✓</span>
                      )}
                    </div>
                  </button>

                  {/* Subcategories */}
                  {category.subcategories.length > 0 && (
                    <div className="border-l-2 border-gray-100 ml-4">
                      {category.subcategories.map((subcat) => (
                        <button
                          key={subcat.id}
                          type="button"
                          onClick={() => handleCategoryClick(subcat.name)}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm transition-colors ${
                            selectedCategory === subcat.name ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="mr-2">{subcat.icon}</span>
                            <span className="capitalize">{subcat.name}</span>
                          </div>
                          {selectedCategory === subcat.name && (
                            <span className="text-blue-600">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Category Info */}
      {selectedCat && !showHierarchy && (
        <div className="mt-2 p-2 bg-gray-50 rounded-md">
          <div className="text-xs text-gray-600">
            {selectedCat.description}
            {selectedCat._count.question_templates > 0 && (
              <span className="block mt-1">
                📋 {selectedCat._count.question_templates} template(s) available for this category
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}