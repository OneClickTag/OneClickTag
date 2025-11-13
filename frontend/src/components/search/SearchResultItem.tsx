import React from 'react';
import {
  Users,
  Target,
  Tag,
  Building,
  Mail,
  TrendingUp,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { SearchResult } from '@/types/search.types';

interface SearchResultItemProps {
  result: SearchResult;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

const getTypeIcon = (type: 'customer' | 'campaign' | 'tag') => {
  switch (type) {
    case 'customer':
      return Users;
    case 'campaign':
      return Target;
    case 'tag':
      return Tag;
    default:
      return Activity;
  }
};

const getTypeColor = (type: 'customer' | 'campaign' | 'tag') => {
  switch (type) {
    case 'customer':
      return 'text-blue-600 bg-blue-100';
    case 'campaign':
      return 'text-green-600 bg-green-100';
    case 'tag':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'paused':
      return 'text-yellow-600 bg-yellow-100';
    case 'inactive':
    case 'completed':
      return 'text-gray-600 bg-gray-100';
    case 'failed':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-blue-600 bg-blue-100';
  }
};

export function SearchResultItem({ 
  result, 
  isSelected = false, 
  onClick, 
  onMouseEnter 
}: SearchResultItemProps) {
  const Icon = getTypeIcon(result.type);
  const typeColor = getTypeColor(result.type);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      // Default navigation
      window.location.href = result.url;
    }
  };

  const renderMetadata = () => {
    switch (result.type) {
      case 'customer':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {result.metadata.company && (
              <div className="flex items-center space-x-1">
                <Building className="h-3 w-3" />
                <span>{result.metadata.company}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Mail className="h-3 w-3" />
              <span>{result.metadata.email}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target className="h-3 w-3" />
              <span>{result.metadata.totalCampaigns} campaigns</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>${result.metadata.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        );

      case 'campaign':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{result.metadata.customerName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>{result.metadata.totalEvents.toLocaleString()} events</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{result.metadata.conversionRate.toFixed(1)}% conversion</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="capitalize">{result.metadata.campaignType}</span>
            </div>
          </div>
        );

      case 'tag':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>{result.metadata.usageCount} uses</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{result.metadata.customerCount} customers</span>
            </div>
            {result.metadata.relatedTags.length > 0 && (
              <div className="flex items-center space-x-1">
                <Tag className="h-3 w-3" />
                <span>{result.metadata.relatedTags.slice(0, 2).join(', ')}</span>
                {result.metadata.relatedTags.length > 2 && (
                  <span>+{result.metadata.relatedTags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    if (result.type === 'customer' || result.type === 'campaign') {
      const status = result.metadata.status;
      const statusColor = getStatusColor(status);
      
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {status}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className={`group flex items-center space-x-3 p-3 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-blue-50 border-l-2 border-blue-500' 
          : 'hover:bg-gray-50 border-l-2 border-transparent'
      }`}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
    >
      {/* Type Icon */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${typeColor}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {result.title}
            </h4>
            {getStatusBadge()}
          </div>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-colors ${
            isSelected ? 'text-blue-500' : 'group-hover:text-gray-600'
          }`} />
        </div>

        {result.subtitle && (
          <p className="text-sm text-gray-600 truncate mb-1">
            {result.subtitle}
          </p>
        )}

        {result.description && (
          <p className="text-xs text-gray-500 truncate mb-2">
            {result.description}
          </p>
        )}

        {/* Metadata */}
        <div className="mt-2">
          {renderMetadata()}
        </div>

        {/* Tags for customers */}
        {result.type === 'customer' && result.metadata.tags.length > 0 && (
          <div className="flex items-center space-x-1 mt-2">
            <Tag className="h-3 w-3 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {result.metadata.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {result.metadata.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{result.metadata.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}