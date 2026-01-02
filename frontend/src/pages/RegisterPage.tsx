import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { productsApi } from '../api/client';
import type { DataProductCreate, PortConfig } from '../api/types';

const STEPS = ['Basic Info', 'Configuration', 'Output Ports', 'Review'];

const LIFECYCLE_STATUSES = [
  { uri: 'urn:lifecycle:Design', label: 'Design' },
  { uri: 'urn:lifecycle:Build', label: 'Build' },
  { uri: 'urn:lifecycle:Consume', label: 'Consume' },
  { uri: 'urn:lifecycle:Retire', label: 'Retire' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<DataProductCreate>({
    label: '',
    description: '',
    owner_uri: '',
    domain_uri: '',
    status_uri: 'urn:lifecycle:Design',
    output_ports: [{ label: '', description: '' }],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch domains
  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: productsApi.domains,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      navigate('/catalog');
    },
  });

  const updateField = (field: keyof DataProductCreate, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const updatePort = (
    index: number,
    field: keyof PortConfig,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      output_ports: prev.output_ports.map((port, i) =>
        i === index ? { ...port, [field]: value } : port
      ),
    }));
  };

  const addPort = () => {
    setFormData((prev) => ({
      ...prev,
      output_ports: [...prev.output_ports, { label: '', description: '' }],
    }));
  };

  const removePort = (index: number) => {
    if (formData.output_ports.length > 1) {
      setFormData((prev) => ({
        ...prev,
        output_ports: prev.output_ports.filter((_, i) => i !== index),
      }));
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.label.trim()) newErrors.label = 'Label is required';
      if (!formData.description.trim())
        newErrors.description = 'Description is required';
    }

    if (step === 1) {
      if (!formData.owner_uri) newErrors.owner_uri = 'Owner is required';
      if (!formData.domain_uri) newErrors.domain_uri = 'Domain is required';
    }

    if (step === 2) {
      const hasValidPort = formData.output_ports.some(
        (port) => port.label.trim()
      );
      if (!hasValidPort) newErrors.output_ports = 'At least one output port is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        // Submit
        createMutation.mutate(formData);
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Register New Data Product
        </h1>
        <p className="text-gray-500 mt-1">
          Add a new data product to the catalog
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < step
                    ? 'bg-primary-600 text-white'
                    : index === step
                    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index < step ? <Check size={16} /> : index + 1}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:block ${
                  index === step ? 'font-medium text-gray-900' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-24 h-0.5 mx-2 ${
                    index < step ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {step === 0 && (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            updateField={updateField}
          />
        )}

        {step === 1 && (
          <ConfigurationStep
            formData={formData}
            errors={errors}
            domains={domains || []}
            updateField={updateField}
          />
        )}

        {step === 2 && (
          <OutputPortsStep
            formData={formData}
            errors={errors}
            updatePort={updatePort}
            addPort={addPort}
            removePort={removePort}
          />
        )}

        {step === 3 && <ReviewStep formData={formData} domains={domains || []} />}

        {/* Error message */}
        {createMutation.isError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            <span>Failed to create product. Please try again.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              'Creating...'
            ) : step === STEPS.length - 1 ? (
              <>
                Create Product
                <Check size={20} />
              </>
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function BasicInfoStep({
  formData,
  errors,
  updateField,
}: {
  formData: DataProductCreate;
  errors: Record<string, string>;
  updateField: (field: keyof DataProductCreate, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name *
        </label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => updateField('label', e.target.value)}
          placeholder="e.g., Customer 360"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.label ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.label && (
          <p className="text-sm text-red-500 mt-1">{errors.label}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe the data product and its purpose..."
          rows={4}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description}</p>
        )}
      </div>
    </div>
  );
}

function ConfigurationStep({
  formData,
  errors,
  domains,
  updateField,
}: {
  formData: DataProductCreate;
  errors: Record<string, string>;
  domains: { uri: string; label: string }[];
  updateField: (field: keyof DataProductCreate, value: unknown) => void;
}) {
  // Mock owners - in production, fetch from API
  const owners = [
    { uri: 'urn:agent:customer-team', label: 'Customer Data Team' },
    { uri: 'urn:agent:sales-team', label: 'Sales Analytics Team' },
    { uri: 'urn:agent:finance-team', label: 'Finance Team' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Owner *
        </label>
        <select
          value={formData.owner_uri}
          onChange={(e) => updateField('owner_uri', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.owner_uri ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select an owner...</option>
          {owners.map((owner) => (
            <option key={owner.uri} value={owner.uri}>
              {owner.label}
            </option>
          ))}
        </select>
        {errors.owner_uri && (
          <p className="text-sm text-red-500 mt-1">{errors.owner_uri}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Domain *
        </label>
        <select
          value={formData.domain_uri}
          onChange={(e) => updateField('domain_uri', e.target.value)}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.domain_uri ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a domain...</option>
          {domains.map((domain) => (
            <option key={domain.uri} value={domain.uri}>
              {domain.label}
            </option>
          ))}
        </select>
        {errors.domain_uri && (
          <p className="text-sm text-red-500 mt-1">{errors.domain_uri}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lifecycle Status
        </label>
        <select
          value={formData.status_uri}
          onChange={(e) => updateField('status_uri', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {LIFECYCLE_STATUSES.map((status) => (
            <option key={status.uri} value={status.uri}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function OutputPortsStep({
  formData,
  errors,
  updatePort,
  addPort,
  removePort,
}: {
  formData: DataProductCreate;
  errors: Record<string, string>;
  updatePort: (index: number, field: keyof PortConfig, value: string) => void;
  addPort: () => void;
  removePort: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Define the output ports that expose data from this product.
      </p>

      {errors.output_ports && (
        <p className="text-sm text-red-500">{errors.output_ports}</p>
      )}

      {formData.output_ports.map((port, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Port {index + 1}</h4>
            {formData.output_ports.length > 1 && (
              <button
                onClick={() => removePort(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Port Label *
            </label>
            <input
              type="text"
              value={port.label}
              onChange={(e) => updatePort(index, 'label', e.target.value)}
              placeholder="e.g., Customer Events API"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
            </label>
            <input
              type="text"
              value={port.description || ''}
              onChange={(e) => updatePort(index, 'description', e.target.value)}
              placeholder="Describe what this port provides..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      ))}

      <button
        onClick={addPort}
        className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
      >
        <Plus size={20} />
        Add Another Port
      </button>
    </div>
  );
}

function ReviewStep({
  formData,
  domains,
}: {
  formData: DataProductCreate;
  domains: { uri: string; label: string }[];
}) {
  const getDomainLabel = (uri: string) =>
    domains.find((d) => d.uri === uri)?.label || uri;
  const getStatusLabel = (uri?: string) =>
    LIFECYCLE_STATUSES.find((s) => s.uri === uri)?.label || 'Design';

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Review Your Data Product</h3>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div>
          <span className="text-sm text-gray-500">Name:</span>
          <p className="font-medium text-gray-900">{formData.label}</p>
        </div>

        <div>
          <span className="text-sm text-gray-500">Description:</span>
          <p className="text-gray-700">{formData.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Domain:</span>
            <p className="text-gray-900">{getDomainLabel(formData.domain_uri)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status:</span>
            <p className="text-gray-900">{getStatusLabel(formData.status_uri)}</p>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-500">Output Ports:</span>
          <ul className="mt-1 space-y-1">
            {formData.output_ports
              .filter((p) => p.label)
              .map((port, i) => (
                <li key={i} className="text-gray-900">
                  • {port.label}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
