import React, { useState } from 'react';

interface JsonPrettyPrintProps {
  data: any;
  initialExpanded?: boolean;
  indentSize?: number;
}

interface NodeProps {
  name: string | number | undefined;
  value: any;
  depth: number;
  isLast: boolean;
  indentSize: number;
  initialExpanded?: boolean;
}

const JsonNode: React.FC<NodeProps> = ({ name, value, depth, isLast, indentSize, initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const getType = (val: any): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  };

  const type = getType(value);
  const isExpandable = (type === 'object' || type === 'array') && value !== null;
  const hasChildren = isExpandable && Object.keys(value).length > 0;
  const indent = ' '.repeat(depth * indentSize);
  const displayName = typeof name === 'string' ? `"${name}"` : name;

  const getValueColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'text-green-600';
      case 'number':
        return 'text-blue-600';
      case 'boolean':
        return 'text-purple-600';
      case 'null':
        return 'text-gray-500';
      default:
        return 'text-gray-800';
    }
  };

  const formatValue = (val: any, type: string): string => {
    if (val === null) return 'null';
    if (type === 'string') return `"${val}"`;
    return String(val);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const renderCollapsedPreview = () => {
    if (!hasChildren) return null;
    const count = Object.keys(value).length;
    const type = Array.isArray(value) ? 'item' : 'property';
    return `${count} ${type}${count > 1 ? 's' : ''}`;
  };

  if (!isExpandable) {
    return (
      <div className="font-mono text-sm whitespace-pre">
        {indent}
        {name !== undefined && (
          <span>
            <span className="text-gray-800">{displayName}</span>
            <span className="text-gray-600">: </span>
          </span>
        )}
        <span className={getValueColor(type)}>{formatValue(value, type)}</span>
        {!isLast && <span className="text-gray-600">,</span>}
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      <div className="whitespace-pre">
        {indent}
        {name !== undefined && (
          <span>
            <span className="text-gray-800">{displayName}</span>
            <span className="text-gray-600">: </span>
          </span>
        )}
        <button
          onClick={toggleExpand}
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : '▪'}
        </button>
        <span className="text-gray-600">
          {Array.isArray(value) ? '[' : '{'}
        </span>
        {!isExpanded && (
          <span className="text-gray-400">
            {' '}
            {renderCollapsedPreview()}
            {' '}
            {Array.isArray(value) ? ']' : '}'}
            {!isLast && ','}
          </span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <>
          {Object.entries(value).map(([key, val], index, arr) => (
            <JsonNode
              key={key}
              name={Array.isArray(value) ? Number(key) : key}
              value={val}
              depth={depth + 1}
              isLast={index === arr.length - 1}
              indentSize={indentSize}
              initialExpanded={initialExpanded}
            />
          ))}
          <div className="whitespace-pre">
            {indent}
            <span className="text-gray-600">
              {Array.isArray(value) ? ']' : '}'}
            </span>
            {!isLast && <span className="text-gray-600">,</span>}
          </div>
        </>
      )}
    </div>
  );
};

export const JsonPrettyPrint: React.FC<JsonPrettyPrintProps> = ({
  data,
  initialExpanded = true,
  indentSize = 2,
}) => {
  return (
    <div className="bg-white rounded-lg p-4 overflow-auto">
      <JsonNode
        name={undefined}
        value={data}
        depth={0}
        isLast={true}
        indentSize={indentSize}
        initialExpanded={initialExpanded}
      />
    </div>
  );
};
